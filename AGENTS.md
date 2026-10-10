<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:storefront-url-scheme -->

## Storefront URL scheme

Four catalogue paths, deliberately distinct — keep them that way:

| Path                        | Renders                                      |
| --------------------------- | -------------------------------------------- |
| `/products`                 | The full catalogue, filterable               |
| `/products/<category-slug>` | A category landing page (filtered catalogue) |
| `/product/<product-slug>`   | A single product detail page                 |
| `/categories`               | The directory page listing every family      |

**Category pages live under `/products/*`; singular product pages under `/product/*`.**
The split exists because a slug can be *both* a category and a product —
`wpc-flooring` is exactly that case — so the two must not share a segment.

Rules of thumb:

- Build category links with `categoryHref()` in `src/lib/floor-families.ts`, not a literal.
- `/categories/<slug>` no longer exists. It 404s by design; there is no redirect.
- `/products?categories=<slug>` is consolidated to `/products/<slug>` by a 308 in
  `src/proxy.ts`, preserving `page` and `sort`. Do not re-point it at `/categories/*`.
- Product links are `/product/<slug>` — see `ProductCard` and `structured-data.ts`.

<!-- END:storefront-url-scheme -->
