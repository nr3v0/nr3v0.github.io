---
layout: post
title: "Vim and Windows? YES!"
date: 2022-09-30 14:49:00 -0700
tags: ["powershell", "vim", "Windows Server 2022"]
permalink: /2022/09/vim-and-windows-yesvim-and-windows-yes.html
original_url: https://www.revo.place/2022/09/vim-and-windows-yesvim-and-windows-yes.html
original_site: "Revo Place"
---

# Installing vim-console on Windows 2022 from PowerShell
Working with Windows Containers has provided me tremendous education.  Learning PowerShell has shown me how far the windows realm has come in the form of CLI management.  It still seems to be lacking in a few areas, and I really don't like the extremely verbose syntax nor the single dash arguments.  But I digress.  This post is about solving a single problem.  The one problem with endless obtuse workarounds.

## Problem
Editing text files...from a windows CLI (cmd.exe, PowerShell, etc).

## Solution
Find the Microsoft equivalent of Vim.   Is that Notepad.exe?  Wordpad.exe?  Get-Contents?
Fail, Fail, Mostly-Fail

## My Solution
Install vim-console; an extremely powerful text editor that has proven to be the staple of all *nix users around the world for decades.

Note: There are many articles similar to [How to Edit Files with a Real PowerShell Text Editor](https://adamtheautomator.com/powershell-text-editor/) that show how to use Chocolaty to install Vim, Emacs or Nano.  However, most of my use cases don't allow Chocolaty in their datacenters.   So, we have to install vim the hard way.

### Steps

1. SSH to your server.

   Don't know how to setup ssh on Windows?  I will point you at their documentation:
   [Getting Started OpenSSH for Windows](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse?tabs=powershell)

2. Verify you are in PowerShell.

   Type the command `powershell` or `pwsh` and hit enter.

   <img width="508" alt="image" src="{{ '/assets/images/vim-and-windows-yesvim-and-windows-yes/01-193352442-9bd2ed0c-c10a-4c49-a7fd-35b5e3191d34.png' | relative_url }}">

   Look for the `PS` in front of your command prompt.

   <img width="451" alt="image" src="{{ '/assets/images/vim-and-windows-yesvim-and-windows-yes/02-193352545-28d539db-c3fc-4572-a54e-a829011fb177.png' | relative_url }}">

3. Download vim-console artifacts from [NLUUG - dunno where I found this](https://ftp.nluug.nl/pub/vim/pc/)

   ```
   wget https://ftp.nluug.nl/pub/vim/pc/vim90rt.zip -o vim90rt.zip
   wget https://ftp.nluug.nl/pub/vim/pc/vim90w32.zip -o vim90w32.zip
   ```

4. Extract archives

   ```
   expand-archive .\vim90w32.zip -DestinationPath .
   expand-archive  -Force .\vim90rt.zip -DestinationPath .
   ```

5. Run installer

   ```
   cd vim\vim90
   .\install.exe
   ```

   Change settings as needed and say `d` for do it.

   <img width="659" alt="image" src="{{ '/assets/images/vim-and-windows-yesvim-and-windows-yes/03-193354139-39971c67-bbe7-45a5-9c4b-93e0657a234a.png' | relative_url }}">

6. Run and Profit
   * Simply type `vim` and hit enter
   * To exit, the key sequence `Esc-:-q-<enter>` will exit.

## Conclusion
I didn't go into a lot of detail but hopefully this helps with the steps for using VIM.

-Nate
