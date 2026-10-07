---
layout: post
title: "Wrangling bash_history across multiple sesions"
date: 2022-09-19 14:49:00 -0700
tags: ["awk", "bash", "histfile"]
permalink: /2022/09/wrangling-bashhistory-across-multiple.html
original_url: https://www.revo.place/2022/09/wrangling-bashhistory-across-multiple.html
original_site: "Revo Place"
---

## BASH_HISTORY_FILE or HISTFILE
I find myself constantly using multiple terminals on the same system.  The default bash history is a good start, but not enough for my needs.  After endless searching, testing, ignoring, deleting, and procrastinating I finally found a solution that works for me.

1. Session Isolation
    - I don't need new history items available across sessions
    - Typically the work I am preforming is isolated but similar enough that having commands updated between sessions is both obnoxious and unhelpful.
2. Custom Timestamp
    - I like seeing a particular timestamp format in my history output (helps me remember what I was doing at that time)
3. Dedupe
    - Like I mentioned above, I don't need commands shared across terminal windows
    - Also, I don't like duplicate uses of command in my history
    - Sure I may lose the first, or prior, occurrence(s) of a command.  But I only require the last use.
4. Write on session exit
    - I don't want to lose my history to a `kill -i <shell_pid>`
    - I also don't want to lose my history if I close the wrong session tab
    - dedupe only needs to happen at this point
5. Use only linux bash commands
    - I don't want to download some fancy utility.
    - use the fewest number of commands
6. Unlimited history
    - computers are big enough and fast enough to handle this
    - new versions of bash allow an unlimited history

## `~/.bashrc`

```
HISTCONTROL=ignorespace:ignoredups:erasedups
shopt -s histappend
HISTSIZE=-1
HISTFILESIZE=-1
HISTTIMEFORMAT="[%b %d,%Y %T] "
PROMPT_COMMAND="history -a;${PROMPT_COMMAND}"
```

## `/etc/profile.d/00-dedup-bash-history-on-exit.sh`

```
function deduphistory {
  echo "deduphistory"
  history -w ~/.bash_history.dedup_backup
  history -n; history -a
  tac ~/.bash_history | awk '!x[$0]++' | tac > ~/.bash_history_new_dedup
  history -cr ~/.bash_history_new_dedup
  history -w
}
# cleanup bash history on exit
trap deduphistory EXIT
```

## Profit
Watch your history get appended and deduped on exit.
No more lost history (mostly)
And be happy

### Files available as gists
<https://gist.github.com/therevoman/a7532af575479f0a2b5edfbb0bef8212>

Originally posted on GitHub:
<https://github.com/therevoman/nate-revo-blog/issues/2>
