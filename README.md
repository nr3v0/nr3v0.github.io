# nr3v0 blog

Source for <https://nr3v0.github.io>, built by GitHub Pages with Jekyll and the
[minima](https://github.com/jekyll/minima) theme.

It brings together the posts from [Revo Place](https://www.revo.place/) and
[Revo Tech](https://therevoman.blogspot.com/). Migrated posts keep their original
Blogger URL paths (`/YYYY/MM/slug.html`), and each one links back to where it
first appeared (`original_url` in the front matter).

## Writing a new post

1. Create `_posts/YYYY-MM-DD-short-slug.md`:

   ```markdown
   ---
   title: "My new post"
   tags: [OpenShift, homelab]
   ---

   Post body in Markdown.
   ```

2. Put images in `assets/images/<short-slug>/` and reference them with
   `![alt text]({{ '/assets/images/<short-slug>/picture.png' | relative_url }})`.
3. Commit and push to `main`. GitHub Pages rebuilds the site in a minute or two.

Work in progress can go in `_drafts/` (no date in the filename). Drafts are not
published.

## Previewing locally

With Ruby development headers installed:

```sh
bundle install
bundle exec jekyll serve --drafts   # http://localhost:4000
```

Or without installing Ruby:

```sh
podman run --rm -it -p 4000:4000 -v "$PWD":/src:Z -w /src docker.io/library/ruby:3.3 \
  bash -c 'bundle install && bundle exec jekyll serve --host 0.0.0.0 --drafts'
```
