---
layout: post
title: "RHV 4.3 misadventures and such"
date: 2019-08-18 13:18:00 -0600
tags: []
permalink: /2019/08/rhv-43-misadventures-and-such.html
original_url: https://therevoman.blogspot.com/2019/08/rhv-43-misadventures-and-such.html
original_site: "Revo Tech"
---

This weekend started like any other.  I had grand hopes for getting my home lab in a place I can focus on OpenShift stuff.  You know,  Install RHV, OpenStack 13, CEPH 3 with RADOS gateway and a few other things.   But it wasn't meant to be.

At least I could get RHV installed on my main Lab box (I'll enumerate my lab later).  It's big enough and fast enough that I can run RHV and put my control plane components on it (Ceph MON's, OpenStack Director, etc) when I get the time.   So I started a RHV 4.3 installation.

It started pretty harmless.   Follow the pre-reqs, make sure you hardware is right, and set the repos.  Link: <https://access.redhat.com/products/red-hat-virtualization/#getstarted>

Because of a DNS quirk I introduced last year when wiring NetworkManager, libvirt and dnsmasq together, I had to restart the install more than a dozen times.  One involved having multiple IP's returned for the hypervisor host, which was fixed in my local DNS provider (unbound).  I swapped back and forth between the cockpit and command line installs but it kept failing with an ssh error.   After a lot of googling I landed on the `host_key_checking=false` ansible setting, and after some lucky guesswork I determined it belonged in the file `/usr/share/ovirt-hosted-engine-setup/ansible/ansible.cfg`. And while I was in there I added a few performance tweaks, which left it looking like this:

```
## Modify Ansible to work properly for a lab?
/usr/share/ovirt-hosted-engine-setup/ansible/ansible.cfg
[defaults]
inventory = hooks/inventory
host_key_checking = false
forks = 20

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey
pipelining = true
```

This got me past the jankiness above.

The next error was a very strange parse error dumped by the vdsm-tool for the libvirt module.  The error was super misleading (complicated by my idiocy), so I traced into the code and found a parsing bug in my /etc/libvirt/qemu.conf file.  A long while back I had added `nvram` settings so I could boot UEFI vm's.   The solution was to move the closing bracket off its own line.

Error Message:

```
# vdsm-tool configure --module libvirt
Checking configuration status...
libvirt is not configured for vdsm yet
Traceback (most recent call last):
File "/usr/bin/vdsm-tool", line 220, in main
return tool_command[cmd]["command"](*args)
File "/usr/lib/python2.7/site-packages/vdsm/tool/__init__.py", line 40, in wrapper
func(*args, **kwargs)
File "/usr/lib/python2.7/site-packages/vdsm/tool/configurator.py", line 124, in configure
if _should_configure(c, pargs.force)]
File "/usr/lib/python2.7/site-packages/vdsm/tool/configurator.py", line 318, in _should_configure
if not _validate(c) and not configure_allowed:
File "/usr/lib/python2.7/site-packages/vdsm/tool/configurator.py", line 85, in _validate
return getattr(module, 'validate', lambda: True)()
File "/usr/lib/python2.7/site-packages/vdsm/tool/configurators/libvirt.py", line 72, in validate
return _isSslConflict()
File "/usr/lib/python2.7/site-packages/vdsm/tool/configurators/libvirt.py", line 115, in _isSslConflict
qconf_p.read(confutils.get_file_path('QCONF', FILES))
File "/usr/lib/python2.7/site-packages/vdsm/tool/configfile.py", line 266, in read
io.StringIO(u'[root]\n' + f.read())
File "/usr/lib64/python2.7/ConfigParser.py", line 324, in readfp
self._read(fp, filename)
File "/usr/lib64/python2.7/ConfigParser.py", line 546, in _read
raise e
ParsingError: File contains parsing errors:
[line 760]: u']\n'
```

These are the offending lines in `/etc/libvirt/qemu.conf`:

```
nvram = [
"/usr/share/edk2.git/ovmf-x64/OVMF_CODE-pure-efi.fd:/usr/share/edk2.git/ovmf-x64/OVMF_VARS-pure-efi.fd"
]
```

Here is the fix:

```
nvram = [ "/usr/share/edk2.git/ovmf-x64/OVMF_CODE-pure-efi.fd:/usr/share/edk2.git/ovmf-x64/OVMF_VARS-pure-efi.fd" ]
```

The rest of the install proceeded without incident!  WooHoo!!!   I have RHV!

![]({{ '/assets/images/rhv-43-misadventures-and-such/01-RHV-Complete.png' | relative_url }})

Ugh, what's that Gluster thing?
