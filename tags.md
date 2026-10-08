---
layout: page
title: Labels
permalink: /tags/
---

<div class="tag-list">
{%- capture tag_names %}{% for tag in site.tags %}{{ tag[0] }}|{% endfor %}{% endcapture %}
  {%- assign tag_names = tag_names | split: "|" | sort_natural %}
{% for name in tag_names %}
<h2 id="{{ name | slugify }}">{{ name }}</h2>
<ul>
  {% for post in site.tags[name] %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <small>{{ post.date | date: "%b %-d, %Y" }}</small></li>
  {% endfor %}
</ul>
{% endfor %}
</div>
