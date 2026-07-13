import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSep,
} from "@/components/ui/breadcrumb";
import { useCollections } from "@/data/collections";
import { useDatagrids } from "@/data/datagrids";
import { useUIStore } from "@/store/ui";

/**
 * Collection / datagrid trail for opened-row chrome (full, modal, and split).
 * Mirrors the fullscreen bar crumbs so every open mode shares the same path.
 */
export function DatagridRowBreadcrumbs({
  datagridId,
  label = "Datagrid row",
}: {
  datagridId: string;
  /** Pass `false` when a parent `<nav>` already names the trail. */
  label?: string | false;
}) {
  const datagridsQuery = useDatagrids();
  const collectionsQuery = useCollections();
  const navigateTo = useUIStore((s) => s.navigateTo);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);

  const datagrid =
    datagridsQuery.data?.find((d) => d.id === datagridId) ?? null;
  const collection =
    collectionsQuery.data?.find((c) => c.id === datagrid?.collection_id) ??
    null;

  return (
    <Breadcrumb
      label={label === false ? undefined : label}
      className="min-w-0 flex-1"
    >
      {collection && (
        <>
          <BreadcrumbLink
            onClick={() => {
              setActiveCollection(collection.id);
            }}
          >
            {collection.name || "Collection"}
          </BreadcrumbLink>
          <BreadcrumbSep />
        </>
      )}
      <BreadcrumbLink
        onClick={() => {
          navigateTo({ datagridId });
        }}
      >
        {datagrid?.name || "Datagrid"}
      </BreadcrumbLink>
    </Breadcrumb>
  );
}
