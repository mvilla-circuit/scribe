import {
  type ComponentPropsWithoutRef,
  forwardRef,
  lazy,
  Suspense,
} from "react";

import type { Editor as EditorImplComponent, EditorHandle } from "./editor";

export type { EditorHandle } from "./editor";
export type EditorProps = ComponentPropsWithoutRef<typeof EditorImplComponent>;

// Code-split the editor so its TipTap/ProseMirror bundle is only fetched when
// an editor is actually mounted, rather than on initial app load.
const EditorImpl = lazy(() =>
  import("./editor").then((m) => ({ default: m.Editor })),
);

// `EditorImpl` is a `forwardRef`, so the imperative `EditorHandle` ref and all
// props are forwarded through this Suspense boundary unchanged. The fallback is
// an empty prose-sized placeholder so the layout doesn't jump while the chunk
// loads.
export const Editor = forwardRef<EditorHandle, EditorProps>(
  function Editor(props, ref) {
    return (
      <Suspense fallback={<div className="scribe-prose" aria-hidden />}>
        <EditorImpl ref={ref} {...props} />
      </Suspense>
    );
  },
);
