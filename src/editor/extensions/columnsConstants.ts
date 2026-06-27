// Column-count bounds for the `columns` layout block. Kept in their own leaf
// module so the node definition and its node view can both read them without
// importing each other (which would form a circular dependency).
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 3;
