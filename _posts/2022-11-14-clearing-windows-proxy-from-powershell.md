---
layout: post
title: "Clearing Windows proxy from PowerShell"
date: 2022-11-14 14:51:00 -0800
tags: ["OpenShift", "powershell", "proxy", "Windows Server 2022"]
permalink: /2022/11/clearing-windows-proxy-from-powershell.html
original_url: https://www.revo.place/2022/11/clearing-windows-proxy-from-powershell.html
original_site: "Revo Place"
---

# The Problem
The Windows Server 2022 Core VM we were working with had a http proxy set but the OpenShift cluster was in an environment that did not need a proxy.  Using the top google hits we were unable to clear the "advproxy" settings.

```
C:\> netsh winhttp show proxy
Current WinHTTP proxy settings:

    Direct access (no proxy server).

C:\> netsh winhttp show advproxy
{
        "Proxy":        "localhost:8080",
        "ProxyBypass":  "*"
}
```

Using `netsh winhttp reset proxy` only cleared the proxy settings.  It did NOT clear the advproxy settings.

# The solution
Create a JSON file with the settings required for `netsh winhttp set advproxy` command.

```
PS C:\Users\Administrator> New-Item proxy.json
    Directory: C:\Users\Administrator

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        11/14/2022   4:05 PM              0 proxy.json

PS C:\Users\Administrator> Set-Content .\proxy.json '{"Proxy": "", "ProxyBypass": "", "AutoconfigUrl": "", "AutoDetect": false}'
PS C:\Users\Administrator> Get-Content proxy.json
{"Proxy": ""}

```

Then execute the netsh command below:

```
netsh winhttp set advproxy setting-scope=machine settings-file=proxy.json

Current WinHTTP advanced proxy settings:

{
}

```

# Thank You
I do not know the difference between the two settings, just know they both influence the system.
