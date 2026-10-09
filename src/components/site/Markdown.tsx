import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ContentImage } from "./ContentImage";

/**
 * Renders CMS Markdown (pages, articles, case studies) as React elements.
 *
 * A deliberately small dialect — headings, paragraphs, lists, quotes, rules,
 * tables, images, links, bold, italic and code — with no raw HTML, so
 * nothing an editor types is ever injected into the page. Links and images
 * are limited to site paths and http(s)/mailto/tel addresses.
 */
export function Markdown({ source, className }: { source: string | null; className?: string }) {
  if (!source?.trim()) return null;

  return <div className={cn("prose-content", className)}>{renderBlocks(parseBlocks(source))}</div>;
}

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "rule" }
  | { type: "code"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "table"; head: string[]; rows: string[][] };

const LIST_ITEM = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/;
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

/** Exported for tests and for deriving tables of contents. */
export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "") {
      index++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const body: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        body.push(lines[index]);
        index++;
      }
      index++;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      // The page title is the only h1, so a "#" in the body becomes an h2.
      const level = Math.min(4, Math.max(2, heading[1].length)) as 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2].replace(/#+\s*$/, "").trim() });
      index++;
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      index++;
      continue;
    }

    const image = IMAGE_LINE.exec(trimmed);
    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      index++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const body: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        body.push(lines[index].trim().replace(/^>\s?/, ""));
        index++;
      }
      blocks.push({ type: "quote", text: body.join(" ") });
      continue;
    }

    if (trimmed.startsWith("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const head = tableCells(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index].trim()));
        index++;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    const listItem = LIST_ITEM.exec(line);
    if (listItem) {
      const ordered = listItem[1] !== undefined;
      const items: string[] = [];
      while (index < lines.length) {
        const match = LIST_ITEM.exec(lines[index]);
        if (match && (match[1] !== undefined) === ordered) {
          items.push(match[2]);
        } else if (lines[index].trim() !== "" && /^\s{2,}/.test(lines[index]) && items.length) {
          // An indented continuation line belongs to the previous item.
          items[items.length - 1] += ` ${lines[index].trim()}`;
        } else {
          break;
        }
        index++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "" && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index++;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function startsBlock(lines: string[], index: number): boolean {
  const trimmed = lines[index].trim();
  return (
    /^#{1,4}\s/.test(trimmed) ||
    trimmed.startsWith(">") ||
    trimmed.startsWith("```") ||
    LIST_ITEM.test(lines[index]) ||
    IMAGE_LINE.test(trimmed) ||
    (trimmed.startsWith("|") && index + 1 < lines.length && isTableDivider(lines[index + 1]))
  );
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function tableCells(row: string): string[] {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderBlocks(blocks: Block[]): ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const Tag = `h${block.level}` as "h2" | "h3" | "h4";
        return (
          <Tag key={index} id={slugify(block.text)}>
            {renderInline(block.text)}
          </Tag>
        );
      }
      case "paragraph":
        return <p key={index}>{renderInline(block.text)}</p>;
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </Tag>
        );
      }
      case "quote":
        return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
      case "rule":
        return <hr key={index} />;
      case "code":
        return (
          <pre key={index}>
            <code>{block.text}</code>
          </pre>
        );
      case "image":
        return safeUrl(block.src) ? (
          <figure key={index}>
            <span className="relative block aspect-[16/9] overflow-hidden rounded-lg bg-muted">
              <ContentImage
                src={block.src}
                alt={block.alt}
                sizes="(min-width: 768px) 720px, 100vw"
              />
            </span>
            {block.alt && <figcaption>{block.alt}</figcaption>}
          </figure>
        ) : null;
      case "table":
        return (
          <div key={index} className="table-scroll">
            <table>
              <thead>
                <tr>
                  {block.head.map((cell, cellIndex) => (
                    <th key={cellIndex} scope="col">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

const INLINE =
  /(`[^`]+`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*)|(_([^_\s][^_]*)_)/;

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest) {
    const match = INLINE.exec(rest);

    if (!match) {
      nodes.push(rest);
      break;
    }

    if (match.index > 0) nodes.push(rest.slice(0, match.index));

    if (match[1]) {
      nodes.push(<code key={key++}>{match[1].slice(1, -1)}</code>);
    } else if (match[2]) {
      const href = match[4];
      const label = renderInline(match[3]);
      nodes.push(
        !safeUrl(href) ? (
          <Fragment key={key++}>{label}</Fragment>
        ) : href.startsWith("/") || href.startsWith("#") ? (
          <Link key={key++} href={href}>
            {label}
          </Link>
        ) : (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ),
      );
    } else if (match[5]) {
      nodes.push(<strong key={key++}>{renderInline(match[6])}</strong>);
    } else if (match[7]) {
      nodes.push(<em key={key++}>{renderInline(match[8])}</em>);
    } else if (match[9]) {
      nodes.push(<em key={key++}>{renderInline(match[10])}</em>);
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

function safeUrl(url: string): boolean {
  return /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(url);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The h2 headings of a document, for an "On this page" list. */
export function outline(source: string | null): { id: string; text: string }[] {
  if (!source) return [];
  return parseBlocks(source)
    .filter(
      (block): block is Extract<Block, { type: "heading" }> =>
        block.type === "heading" && block.level === 2,
    )
    .map((block) => ({ id: slugify(block.text), text: block.text.replace(/[*_`]/g, "") }));
}
