---
layout: post
title: "OpenShift 4.11 - Nutanix and Windows Nodes Temporary Workaround"
date: 2022-10-25 14:51:00 -0700
tags: ["Nutanix", "OpenShift", "powershell", "Windows Server 2022"]
permalink: /2022/10/openshift-411-nutanix-and-windows-nodes.html
original_url: https://www.revo.place/2022/10/openshift-411-nutanix-and-windows-nodes.html
original_site: "Revo Place"
---

# OpenShift 4.11 and Windows Containers
This feels like a match made in heaven for organizations that are slowly consuming their monoliths or who have decided on Microsoft technologies for their datacenter.  Either way, Windows Node support has come a long way in the last 2 years.

I must preface this discussion with the assumption that "everyone knows that Linux and WIndows are different".  Not in the way "milk is different from water" but more along the lines of steak is different from broccoli.  Sure, there are many ways the interaction feels similar but would probably wouldn't steam a nice steak or smother broccoli in steak sauce(not unreasonable).  Unfortunately, Kubernetes exposes all the ways the two are different.  Some of this is probably to the history of Kubernetes being developed on Linux, using Linux Containers, with the strong drive of kernel developers to maintain a stable ABI.  With WIndows 11 and Windows Server 2022 Microsoft has finally been able to address the ABI/Kernel version issues it suffered from and make the experience closer to Linux.  But there are so many other differences which I won't address.

Next, many organizations are adopting Nutanix in their datacenters and wish to run WIndows Containers on OpenShift on Nutanix.  OpenShift 4.11+ on Nutanx is a wonderful combination and is fully supported.  Windows Container support in Kubernetes is coming along nicely.  Windows Server 2022 makes windows containers usable outside of AKS or Docker Desktop.  And the Red Hat Windows Machine Config Operator(WMCO) automates the process of adding a Windows VM to a Kubernetes cluster with the OpenShift Machine api.

The WMCO is written to deal with differences between Linux hosts and Windows hosts and is written and maintained by Red Hat and the community.  OpenSSH needs to be installed and enabled on the Windows host as this is the medium which files are transferred, services are created and the host gets configured.  As an operator, WMCO has its own lifecycle and support policy.  As of this writing it only supports platform types of (none, aws and vsphere).

At this point in time the only way to get a Windows Node in a cluster installed on Nutanix is with BYOH and some unsupported steps.
 Again THIS METHOD IS UNSUPPORTED and support is on its way.  Here is a rough outline too add a host assuming the SDN is OVNKubernetes and Hybrid Networking was configured at cluster install.

# Steps
1. Install cluster with [networking.type: OVNKuberenetes](https://docs.openshift.com/container-platform/4.11/installing/installing_nutanix/installing-nutanix-installer-provisioned.html#installation-configuration-parameters-network_installing-nutanix-installer-provisioned) and [HybridNetworking](https://docs.openshift.com/container-platform/4.11/networking/ovn_kubernetes_network_provider/configuring-hybrid-networking.html)
2. Run [prerequisites](https://docs.openshift.com/container-platform/4.11/windows_containers/enabling-windows-container-workloads.html)
   * install wmco namespace
   * install wmco operator
   * create cloud-private-key secret
      * https://docs.openshift.com/container-platform/4.11/windows_containers/enabling-windows-container-workloads.html
3. Create a VM and install Windows 2022 (core or ui)
4. Make modifications to match the environment.
5. [Install OpenSSH](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse?tabs=powershell)
6. [Create SSH Key for the Administrator user and add to administrator_authorized_user](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)
   * `$powershell.exe get-content $env:ProgramData\ssh\administrators_authorized_keys`
7. Verify you can log in from your bastion host
8. OpenPort 10250
   * `powershell.exe New-NetFirewallRule -DisplayName "ContainerLogsPort" -LocalPort 10250 -Enabled True -Direction Inbound -Protocol TCP -Action Allow -EdgeTraversalPolicy Allow`
9. Run Windows SysPrep similar to the [vsphere steps 8-9](https://docs.openshift.com/container-platform/4.11/windows_containers/creating_windows_machinesets/creating-windows-machineset-vsphere.html#creating-the-vsphere-windows-vm-golden-image_creating-windows-machineset-vsphere)
10. Shutdown VM and Create a Template or Disk Image
11. Clone VM
12. Start Cloned VM
13. Verify IP is unique and verify reverse DNS (PTR) is correct
14. Change hostname of Cloned VM
   * `powershell.exe Rename-Computer -NewName <valid-name> -Restart`
   * reboot
15. As documented in the BYOH instructions [Create windows-instances ConfigMap](https://docs.openshift.com/container-platform/4.11/windows_containers/byoh-windows-instance.html)
16. Initially you may see the node come into the cluster correctly.  However, once the kubelet starts it selects the "hybrid interface" IP and tries to join the cluster with this incorrect IP.
17. Once you see the node added, Ready and Unscheduleable
    * ssh to windows host
    * Display the binpath of the kubelet service
      * `sc.exe qc kubelet`
    * Copy binpath from above command and add `--node-ip=<correct_ip>` to the end
      * `sc.exe config binPath= "c:\k\kubelet.exe --config=c:\k\kubelet.conf --bootstrap-kubeconfig=c:\k\bootstrap-kubeconfig --kubeconfig=c:\k\kubeconfig --cert-dir=c:\var\lib\kubelet\pki\ --windows-service --logtostderr=false --log-file=C:\var\log\kubelet\kubelet.log --register-with-taints=os=Windows:NoSchedule --node-labels=node.openshift.io/os_id=Windows --container-runtime=remote --container-runtime-endpoint=npipe://./pipe/containerd-containerd --resolv-conf= --cloud-provider= --v=3 --node-ip=192.168.20.104"`
    * Restart kubelet
      * `powershell restart-service kubelet`
18. Now you should see 3+ Approved CSR's and your node should become Ready and Scheduleable

# Troubleshooting:
## Pending CSR's?
Indicates the reverse DNS record is missing or incorrect
## Node stuck UnScheduleable?
Node IP isn't in the same subnet as the linux nodes.  Or Firewall is blocking something

# Appendix - Known issues with Windows Containers on Nutanix
## Kubelet chooses the wrong IP to add to the cluster
The kubelet code is failing to lookup the correct IP from the nutanix machine api implementation and falls into the "grab a random IP", which obviously always grabs the wrong one.
This is what step #16 works around.  Providing an argument to the kubelet for the node-ip, bypassing auto-descovery.
## Nutanix Machine Provider API hardcodes "Legacy BIOS" as the boot mode
Customers wishing to boot their kubernetes VM's with UEFI will need to wait for the resolution of  [Issue 29](https://github.com/openshift/machine-api-provider-nutanix/issues/29)
## Nutanix Machine Provider API only accepts "Image"
Do not confuse this with a "Template".  An Image in Nutanix defines just the disk volume (think VMDK or qcow2) and does not contain any VM definitions.
There is not an issue written to address this.
## But I want to try a MachineSet
You can try.  Clone your existing machine set and make the correct modification.  However, the kubelet still chooses the incorrect IP and changes to the service get overwritten by WMCO and the machine-api
## Where can I follow the work
[RFE-3354](https://issues.redhat.com/browse/RFE-3354)
[machine-api-provider-nutanix issue 29](https://github.com/openshift/machine-api-provider-nutanix/issues/29)
