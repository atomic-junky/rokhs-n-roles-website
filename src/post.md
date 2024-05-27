---
title: "{{ post.title }}"
layout: layouts/base.njk
pagination:
  data: posts
  size: 1
  alias: post
permalink: "{{ post.url }}/index.html"
---


{{ post.content }}