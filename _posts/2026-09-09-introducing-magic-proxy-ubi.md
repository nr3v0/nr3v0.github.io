---
title: "Introducing Magic Proxy UBI"
date: 2026-09-09 12:40:00 -0600
tags: ["homelab", "haproxy", "containers", "selfhosted"]
---

I've been clauding around and shipped a project I'm genuinely proud of: **[Magic Proxy UBI](https://github.com/nr3v0/magic-proxy-ubi)**, a from-scratch container image pairing HAProxy 3.3 (AWS-LC) with the HAProxy Data Plane API on Red Hat UBI10.

The backstory: my home lab ran HAProxy bolted onto pfSense for years, routing traffic across a dozen-plus internal apps and a few OpenShift clusters. I wanted it out of the firewall and into its own purpose-built, disposable container: non-root by design, with automatic Let's Encrypt certs via DNS-01 (Porkbun), and a live REST API for config changes instead of editing files by hand.

A few things I'm happy with:

* 🔒 Runs as a non-root user, no `--cap-add` needed for privileged ports. A Linux file capability handles that.
* 📦 Trimmed the image from 459MB down to 244MB by ripping out a redundant build stage.
* 🔁 Certs issue and renew independently per domain (or grouped as SANs when a service needs it), so one DNS hiccup doesn't take down the whole fleet.

It's live on GitHub if you want to see how it's built: <https://github.com/nr3v0/magic-proxy-ubi>
