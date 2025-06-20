---
layout: layouts/post.njk
pagination:
  data: posts
  size: 1
  alias: post
permalink: '{{ post.url }}/index.html'
---

<slot />
