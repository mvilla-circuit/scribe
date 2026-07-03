import { toast } from "sonner";

import { pageRef, type PageTargetType } from "./extensions/page-ref";

/**
 * Copy a page or book's canonical internal link (`scribe://…`) to the clipboard
 * and surface quiet feedback. Shared by the editor's page-link card, the sidebar
 * row menus, and the page-title affordance so every "copy link" surface behaves
 * identically. Resolves once the toast has fired (success or error) so the copy
 * never throws on a rejected clipboard write.
 */
export function copyPageLink(
  targetType: PageTargetType,
  targetId: string,
): Promise<void> {
  return navigator.clipboard.writeText(pageRef(targetType, targetId)).then(
    () => {
      toast.success("Link copied");
    },
    () => {
      toast.error("Couldn't copy link");
    },
  );
}
