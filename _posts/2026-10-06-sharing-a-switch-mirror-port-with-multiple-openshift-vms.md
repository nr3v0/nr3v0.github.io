---
title: "Sharing One Switch Mirror Port with Multiple VMs on OpenShift Virtualization"
date: 2026-10-06 18:46:00 -0600
tags: ["OpenShift", "OpenShift Virtualization", "networking", "nmstate", "homelab"]
---

*How to feed a single SPAN/mirror port into more than one OpenShift Virtualization VM, why the obvious options don't work, and the bridge setting that fixes it.*

---

## The problem

You've set up a mirror (SPAN) session on your switch and patched the destination port into a spare NIC on an OpenShift node. You want **two VMs** to see that traffic: say, an IDS like Suricata and a packet capture or Zeek box. One or both may also need to send traffic back out through that port.

This sounds simple, but most of the obvious ways to give a VM a physical network don't work for mirrored traffic. Mirrored frames aren't addressed to your VMs. They're copies of conversations between *other* hosts, so their destination MACs belong to machines that may not even be on this network segment. Anything that forwards based on destination MAC will quietly drop most of them.

This post walks through the options, explains why most of them fail, and shows a working setup that uses a Linux bridge running as a hub.

My lab host, `snok`, is a single-node OpenShift 4.22 cluster with OpenShift Virtualization on an ASRock Rack EPYCD8 board. It has two spare onboard NICs (`enp65s0f0`, `enp65s0f1`) next to the 25G bond that carries cluster traffic. The examples use those names, so substitute your own.

---

## The options

| Approach | Both VMs see all traffic? | Why / why not |
|---|---|---|
| **OVN-Kubernetes localnet** (ClusterUserDefinedNetwork) | ❌ | OVN is a logical switch. It delivers frames to the port that owns the destination MAC. Mirrored frames are addressed to other hosts, so they mostly go nowhere. |
| **PCI passthrough** of the NIC port | ❌ (only one VM) | Works well for *one* VM, but a device can only be passed to one guest. |
| **SR-IOV VFs** | ❌ | Each VF filters on its own MAC. Promiscuous VFs need hardware and driver support (and "trust" mode), and even then results vary, especially on 1G Intel parts. |
| **macvtap** | ❌ | Bridge mode only delivers frames for the macvtap's own MAC. Passthrough mode is one guest only. |
| **Linux bridge, normal mode** | ⚠️ Partly | Unknown-destination frames are flooded, but the bridge learns MACs and can then forward frames *away* from the VMs. Behavior changes over time. |
| **Linux bridge, hub mode** (`ageing-time 0`) | ✅ | No MAC learning, so every frame is flooded to every port. Both VMs see everything. |

The winner is the last row. A Linux bridge with MAC learning turned off behaves like an old-fashioned Ethernet hub: every frame coming in the mirror port goes out to every attached VM.

---

## Architecture

```
  Switch                         OpenShift node (snok-fast)
 ┌────────────┐                ┌──────────────────────────────────────────┐
 │ SPAN dest  │── patch cable ─┤ enp65s0f0 (promisc, GRO/LRO off, no IP)  │
 │   port     │                │      │                                   │
 └────────────┘                │  ┌───┴──────────────────────────┐        │
                               │  │ br-mirror (linux-bridge)      │        │
                               │  │  mac-ageing-time: 0  → hub    │        │
                               │  │  stp off, mcast snooping off  │        │
                               │  └───┬───────────────────┬───────┘        │
                               │      │ tap               │ tap            │
                               │  ┌───┴────┐         ┌────┴───┐            │
                               │  │ VM  A  │         │ VM  B  │            │
                               │  │ eth1   │         │ eth1   │            │
                               │  │ promisc│         │ promisc│            │
                               │  └────────┘         └────────┘            │
                               └──────────────────────────────────────────┘
```

Three pieces make this work:

1. A **NodeNetworkConfigurationPolicy** (NNCP) that builds `br-mirror` on the node with the spare NIC as its only uplink.
2. A **NetworkAttachmentDefinition** (NAD) that exposes that bridge to VMs using the `bridge` CNI plugin.
3. A **second interface** on each VM attached to that NAD.

---

## Step 1: Build the hub-mode bridge on the node

The Kubernetes NMState Operator manages host networking declaratively. This policy takes over the spare NIC, turns off the offloads that would hide what's really on the wire, and puts it in a bridge with MAC learning disabled.

```yaml
apiVersion: nmstate.io/v1
kind: NodeNetworkConfigurationPolicy
metadata:
  name: br-mirror
spec:
  nodeSelector:
    kubernetes.io/hostname: snok-fast
  desiredState:
    interfaces:
    - name: enp65s0f0
      type: ethernet
      state: up
      mtu: 9000
      ipv4: {enabled: false}
      ipv6: {enabled: false}
      ethtool:
        feature:
          rx-gro: false        # don't coalesce frames — deliver what was on the wire
          rx-lro: false
    - name: br-mirror
      type: linux-bridge
      state: up
      mtu: 9000
      ipv4: {enabled: false}
      ipv6: {enabled: false}
      bridge:
        options:
          stp:
            enabled: false
          mac-ageing-time: 0           # never learn MACs → flood every frame (hub)
          multicast-snooping: false    # flood multicast to every port too
          group-forward-mask: 16384    # also forward LLDP (01:80:c2:00:00:0e)
        port:
        - name: enp65s0f0
```

What each setting does:

- **`mac-ageing-time: 0`** is the key setting. Normally a bridge learns which MAC lives behind which port and forwards only there. With ageing at zero, learned entries expire immediately, so the bridge never has a forwarding entry and floods every unicast frame to all ports. That's exactly how a hub behaves.
- **`multicast-snooping: false`**: with snooping on, the bridge sends multicast only to ports that joined the group. Your sensors haven't joined anything, so turn it off and let multicast flood too.
- **`group-forward-mask: 16384`**: Linux bridges consume IEEE link-local frames (`01:80:c2:00:00:0X`) by default. Bit 14 (`0x4000`) lets LLDP through, which is handy for an IDS. The kernel won't let you forward STP, PAUSE or LACP (bits 0–2) regardless.
- **GRO/LRO off**: with these on, the NIC merges consecutive TCP segments into large super-frames before the bridge sees them. Capture tools then report packets that never existed on the wire, and IDS reassembly can get confused.
- **No IP on the NIC or bridge**: the host doesn't need to take part in this network. It just forwards frames.
- **MTU 9000**: if any mirrored source port carries jumbo frames, the copies will be jumbo too. Undersized MTUs drop them silently.

You don't need to set promiscuous mode on the NIC. The kernel enables it automatically on any interface added to a bridge.

VLAN filtering is left **off** (the nmstate default when you don't configure VLANs on the ports), so 802.1Q-tagged frames from a trunk mirror pass through with their tags intact.

Apply it and check:

```bash
oc apply -f nncp-br-mirror.yaml
oc get nncp br-mirror
oc get nnce
# On the node:
cat /sys/class/net/br-mirror/bridge/ageing_time   # → 0
ip -d link show enp65s0f0 | grep -o promiscuity.*  # → promiscuity 1
```

---

## Step 2: Expose the bridge to VMs

Create a NetworkAttachmentDefinition in the namespace where your VMs live:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: mirror-tap
  namespace: default
  annotations:
    k8s.v1.cni.cncf.io/resourceName: bridge.network.kubevirt.io/br-mirror
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "mirror-tap",
      "type": "bridge",
      "bridge": "br-mirror",
      "mtu": 9000,
      "macspoofchk": true,
      "ipam": {}
    }
```

Notes:

- The **`resourceName` annotation** makes the scheduler place VMs only on nodes where `br-mirror` exists. On a single-node cluster that doesn't matter much, but it costs nothing and protects you if you add nodes later.
- **`ipam: {}`**: no addresses are handed out. Sensors listen and don't need IPs on the capture interface.
- **`macspoofchk: true`** only affects traffic *leaving* the VM. It stops the VM from sending frames with any MAC except its own. Leave it on for passive sensors. Set it to `false` only if a VM needs to inject traffic with other source MACs (for example, an inline tool or one that forges TCP resets).

---

## Step 3: Attach the VMs

Add a second interface to each VM. Keep the VM's normal management network as-is.

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: sensor-a
  namespace: default
spec:
  template:
    spec:
      domain:
        devices:
          interfaces:
          - name: default
            masquerade: {}
          - name: mirror
            bridge: {}
            model: virtio
      networks:
      - name: default
        pod: {}
      - name: mirror
        multus:
          networkName: mirror-tap
```

Repeat for `sensor-b`. Every VM attached to `mirror-tap` gets its own tap device on `br-mirror`, and the hub floods every frame to all of them.

---

## Step 4: Configure the guests

Inside each guest, bring the capture interface up with no address and in promiscuous mode:

```bash
ip link set eth1 up promisc on
ip link set eth1 mtu 9000
# Turn off offloads inside the guest as well, for accurate captures
ethtool -K eth1 gro off lro off 2>/dev/null || true
```

Then point your tools at it:

```bash
tcpdump -i eth1 -nn -c 20
zeek -i eth1 local
suricata -i eth1
```

On a systemd-networkd or NetworkManager guest, make this persistent with a profile that has no IP configuration and promiscuous mode enabled, so it comes back after reboots.

---

## Gotchas worth knowing before you start

### 1. Can the VMs "connect" through the mirror port?

Often not. **Many switches ignore incoming traffic on a SPAN destination port by default.** It's a one-way copy. If your VMs need to send traffic (active scanning, TCP resets, or simply having an IP on that segment), you have two choices:

- Enable ingress on the mirror session. On Cisco IOS that's `monitor session 1 destination interface Gi1/0/10 ingress vlan 20`, and other vendors have similar settings.
- Use a **second, normal access port** (on `snok` that's the other spare NIC, `enp65s0f1`) for anything the VMs need to send, and keep the mirror port receive-only. This is usually the cleaner design.

### 2. The VMs can see each other

A hub is a hub. Anything sensor A transmits on its mirror interface goes to the physical port **and** to sensor B. For passive sensors that never send, it doesn't matter. For anything active, keep it in mind.

### 3. Oversubscription happens on the switch, not the host

If you mirror several busy 10G or 25G ports into a 1G destination, the switch drops the excess before it ever reaches the NIC, and nothing on the host will tell you. Check the destination port speed (`ethtool enp65s0f0`) and the switch's drop counters on the mirror session. If you need more, use a faster destination port or mirror less.

### 4. nmstate must be able to verify the change

After applying a policy, nmstate checks that the node still works. It pings the default gateway(s), checks DNS and contacts the API server. If any of those fail, it **rolls the change back**, even when your change had nothing to do with the failure.

I hit this on `snok`: the node had a stale IPv6 default gateway left over from an ISP prefix change. Every NNCP failed verification on the dead IPv6 gateway and was rolled back. One policy even ended up permanently stuck in `Pending / MaxUnavailableLimitReached`. If `oc get nnce` shows a policy cycling or stuck, check the nmstate handler logs for probe errors before blaming your YAML:

```bash
oc -n openshift-nmstate logs ds/nmstate-handler | grep -i probe
```

Fix the broken gateway first, then apply the bridge.

### 5. Don't put the mirror port on OVN's bridges

It's tempting to add the NIC to an OVS bridge and map it with an OVN `localnet` network, since that's how secondary VLAN networks usually work in OpenShift Virtualization. For mirrored traffic it's the wrong tool: OVN's logical switch forwards by destination MAC and won't hand foreign unicast frames to your VM ports. Keep the mirror on a plain Linux bridge, separate from `br-ex` and any OVN-mapped bridges.

### 6. Live migration

The VMs can only run on nodes that have the mirror cable plugged in. On a single-node cluster that's automatic. On multi-node clusters, the `resourceName` annotation keeps the scheduler honest, but live migration to a node without the mirror feed won't work. Set `evictionStrategy: None` (or plan for the sensors to stop during node maintenance).

---

## Verifying end to end

1. On the node, check that mirrored traffic is arriving:
   ```bash
   tcpdump -i enp65s0f0 -nn -c 10
   ```
2. Check that both taps are on the bridge:
   ```bash
   bridge link show master br-mirror
   ```
3. Inside **each** guest, run `tcpdump -i eth1 -nn` and make sure you see traffic between *other* hosts. That's the proof the hub is flooding and not just passing broadcasts.
4. Generate a known flow from a mirrored host (for example `curl` a known site) and confirm both sensors see it.

If the guests only see broadcasts, ARP and multicast but no unicast between other hosts, the bridge is still learning MACs. Check `ageing_time` on `br-mirror` and make sure it's `0`.

---

## Summary

To share one switch mirror port with several OpenShift Virtualization VMs:

1. Put the mirror NIC in a **Linux bridge with `mac-ageing-time: 0`** and multicast snooping off, so the bridge acts as a hub. Turn off GRO/LRO on the NIC.
2. Expose the bridge with a **`bridge` CNI NetworkAttachmentDefinition** that has no IPAM.
3. Give each VM a **second `bridge` interface** on that network and set it to promiscuous mode in the guest.
4. Remember that a SPAN destination is usually receive-only. Use a separate normal port if your VMs need to send.

It takes three short YAML files, and it avoids the destination-MAC filtering that defeats OVN, SR-IOV and macvtap for this use case.
