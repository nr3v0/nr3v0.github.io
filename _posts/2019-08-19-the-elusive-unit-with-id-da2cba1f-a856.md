---
layout: post
title: "The elusive Unit with ID \"da2cba1f-a856-4a7e-8df0-b6f4101587af\" could not be found."
date: 2019-08-19 23:23:00 -0600
tags: []
permalink: /2019/08/the-elusive-unit-with-id-da2cba1f-a856.html
original_url: https://therevoman.blogspot.com/2019/08/the-elusive-unit-with-id-da2cba1f-a856.html
original_site: "Revo Tech"
---

I have some "off" brand MiniPC's that I wanted to add to my home lab.  While trying to register them, they all returned the same message.

***HTTP error (404 - Not Found): Unit with ID "da2cba1f-a856-4a7e-8df0-b6f4101587af" could not be found.***

I'm not exactly sure, but it seems the bios/efi information is the same across all the boxes.  To get arround the error with subscription-manager I logged directly into <https://access.redhat.com/management/systems> and added the system manually.   Once I had a UUID I ran subscription-manager again to register the system.

```
subscription-manager register --consumerid=<new-uuid>
```

Happy cheap labbing.
