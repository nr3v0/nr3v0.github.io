---
layout: post
title: "Adding nerdctl to an OpenShift 4 Windows Node"
date: 2022-11-14 14:51:00 -0800
tags: ["nerdctl", "OpenShift", "powershell", "Windows Server 2022"]
permalink: /2022/11/adding-nerdctl-to-openshift-4-windows.html
original_url: https://www.revo.place/2022/11/adding-nerdctl-to-openshift-4-windows.html
original_site: "Revo Place"
---

# Getting a Windows Node on OpenShift
... Not what this post is about, follow the Red Hat and Microsoft documentation and then consult with your certified Red Hat Solutions Architect or Consultant.

# Now that I have a windows node
* &lt;WARNING&gt; Administering a windows node is highly discouraged and will probably result in an unsupported configuration.
In order to install nerdctl, log into the necessary Windows Node and switch to PowerShell.

```
ssh win2022

Microsoft Windows [Version 10.0.20348.1070]
(c) Microsoft Corporation. All rights reserved.

administrator@WIN2022 C:\Users\Administrator> powershell
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows

PS C:\Users\Administrator>
```

# Append to System PATH - Permanently
Borrowing commands from a friendly blogger we need to append a new entry to the system PATH.
[Permanently Modify System Path](https://codingbee.net/powershell/powershell-make-a-permanent-change-to-the-path-environment-variable)
Run these:

```
rem Show Current Path
PS C:\Users\Administrator> $ENV:PATH
rem Save Current Path to a variable
PS C:\Users\Administrator> $oldpath = (Get-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH).path

rem Add a new folder for our binary
PS C:\Users\Administrator> mkdir C:\bin
rem Change directory to the new folder
PS C:\Users\Administrator> cd C:\bin
PS C:\bin> $newpath = "$oldpath;C:\bin"

rem Update System Path
PS C:\bin> Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH -Value $newPath

rem Verify the Path
PS C:\bin> (Get-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH).Path

rem Reboot node - or close out of your shells and relogin
Restart-Computer -Force
```

# Download and install nerdctl.exe
With all that yak shaving out of the way we can get to it.
Find the latest windows release (nerdctl-x.y.z-windows-amd64.tar.gz)
[nerdctl-1.0.0-windows-amd64.tar.gz](https://github.com/containerd/nerdctl/releases/download/v1.0.0/nerdctl-1.0.0-windows-amd64.tar.gz)
[nerdctl releases](https://github.com/containerd/nerdctl/releases)

```
rem start Powershell and change to the bin folder
rem Download the release file.
PS C:\bin> curl https://github.com/containerd/nerdctl/releases/download/v1.0.0/nerdctl-1.0.0-windows-amd64.tar.gz -o nerdctl-1.0.0-windows-amd64.tar.gz

rem Extract nerdctl.exe from the compressed file
PS C:\bin> tar -xzvf nerdctl-1.0.0-windows-amd64.tar.gz
x nerdctl.exe

rem Delete the compressed file
PS C:\bin> rm nerdctl-1.0.0-windows-amd64.tar.gz

rem Test a nerdctl.exe command
PS C:\bin> nerdctl.exe ps
CONTAINER ID    IMAGE    COMMAND    CREATED    STATUS    PORTS    NAMES

```

# Celebrate
You can now interact with your containers on the windows node.
