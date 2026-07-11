import type { Book } from "@/data/books";
import type { Document } from "@/data/documents";
import type { Entry } from "@/data/entries";
import type { Folder } from "@/data/folders";
import type { Tables } from "@/lib/database.types";

// Minimal-but-complete row factories so tests can build valid entities without
// repeating every column. Override only the fields a given case cares about.

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    user_id: "user-1",
    title: "Untitled",
    subtitle: null,
    cover_url: null,
    icon: null,
    theme: {},
    folder_id: null,
    collection_id: null,
    position: 1024,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: "folder-1",
    user_id: "user-1",
    name: "Folder",
    parent_folder_id: null,
    position: 1024,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    user_id: "user-1",
    book_id: "book-1",
    parent_document_id: null,
    title: "Untitled",
    subtitle: null,
    content: {},
    icon: null,
    banner_color: null,
    banner_text: null,
    font_overrides: null,
    is_title_page: false,
    show_outline: true,
    show_subtitle: false,
    show_contents: false,
    spellcheck_enabled: true,
    spellcheck_ignores: [],
    position: 1024,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeCollection(
  overrides: Partial<Tables<"collections">> = {},
): Tables<"collections"> {
  return {
    id: "collection-1",
    user_id: "user-1",
    name: "Untitled",
    icon: null,
    description: null,
    parent_collection_id: null,
    fields: [],
    view: {},
    position: 1024,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "entry-1",
    user_id: "user-1",
    collection_id: "collection-1",
    title: "Untitled",
    icon: null,
    cover_url: null,
    content: {},
    properties: {},
    position: 1024,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
