---
layout: post
title: "Reviving a bricked Netgear Nighthawk x6 aka R8000 & Serial Console"
date: 2016-11-07 15:39:00 -0700
tags: []
permalink: /2016/11/reviving-bricked-netgear-nighthawk-x6.html
original_url: https://therevoman.blogspot.com/2016/11/reviving-bricked-netgear-nighthawk-x6.html
original_site: "Revo Tech"
---

Last night I was playing with bonded network interfaces on my personal NAS when my router stopped responding (turns out my Internet provider doesn't like Jumbo Frames!).  I'm using the Tomato by Shibby firmware v136 and was unable to get into the admin console to reset the configuration as my router kept rebooting.  After fiddling for an hour I turned to the interwebs.  It seemed it was time for me to venture into the scary world of Serial Console debugging.

I'm familiar with SSH as I use it on a daily basis for various tasks but was terrified of the unknown.  What is a serial console, why do I have to connect wires between my computer and the device, what's that thingy in the middle.  Luckily google saved the day with a link to this post.

<https://www.myopenrouter.com/article/how-set-serial-console-netgear-r8000>

Unfortunately, it assumed a few things that were vital to my success.  Once I figured those out all the fear left and I was filled with a nerdy kind of joy.

First, I had to learn what a USB-TTL device was, and what it was for.  The important bits are that this device creates a COM port on your system over USB which a program can connect to and translates it into a simpler communication signal that a lot of hardware can understand.  Lucky for me I had one of these close by as I use them to program Arduino Mini Pro (and others) boards.  Connect the USB end to a computer.  Install the drivers (pain in the rear on Windows 10 if you have a non-prolific board, I'm not going to discuss it here).  Use Windows Device Manager to figure out what COM port it was assigned (COM9 for me).

Second, Opening the router.  Since I don't have pictures yet I'll just say I had to remove 5 screws on the bottom, and 5 from the back of the router, then a gentle push in the right direction and the cover came off.  NOTE: Be very careful as the antenna's are connected to the board with a very small gauge wire.  I had to disconnect the u.FL connector on one antenna to access the Pins shown in the above link.  NOTE2: never power on the router without antenna's attached, it could permanently damage the device!

Third, why is hardware hard?  Only connect 3 pins from the USB-TTL device to the routers board.  Ground, RX & TX.  Ground goes to Ground.  RX goes to TX and TX goes to RX!  :O

Last, software selection and configuration.  Its amazing, I've been working with technology for 30 years and have never learned this before.  Most SSH clients have the option of connecting via a Serial port, instead of a network address.  So, I fired up my trusty XShell client (Paid License even) and set up a new connection.  Protocol: SERIAL, Port: COM9, Baud Rate (115200).  Then Connect!  It works!!!   Actually, I had to work my way through the baud rates to find the right one, common rates are 9600, 19200, 57600 and 115200.  I tried all 4.  The wrong ones just displayed a lot of garbage.  Once I found the right rate the debug messages came through loud and clear.  A simple Ctrl+C opened a prompt, and I was able to "erase nvram".

To be honest, I'm not sure what finally allowed me to connect to my router.  Maybe it was because the internet provider was disconnected from the WAN port.  Maybe having the Serial Console connected prevented the reboots.  Either way I was able to log into the admin console and unset Jumbo frames.  Now I'm a happy camper again.

Until next time!
