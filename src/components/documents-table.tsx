"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteDocumentAction, deleteDocumentsAction } from "@/app/actions/documents";
import { Badge, Button, Table, Th, Td, Tr } from "@/components/ui";

type DocumentRow = {
  id: string;
  fileName: string;
  category: string;
  propertyName: string | null;
  createdAt: string;
};

type DocumentsTableProps = {
  documents: DocumentRow[];
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = documents.length > 0 && selected.size === documents.length;
  const selectedCount = selected.size;

  const deleteOne = useMemo(
    () => (documentId: string) => deleteDocumentAction.bind(null, documentId),
    []
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((doc) => doc.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <form action={deleteDocumentsAction} className="flex items-center gap-3">
          {Array.from(selected).map((id) => (
            <input key={id} type="hidden" name="documentIds" value={id} />
          ))}
          <Button type="submit" variant="destructive" size="sm">
            Delete {selectedCount} selected
          </Button>
          <button
            type="button"
            className="text-sm text-muted underline"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </button>
        </form>
      )}

      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all documents"
              />
            </Th>
            <Th>File</Th>
            <Th>Category</Th>
            <Th>Property</Th>
            <Th>Date</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <Tr key={doc.id}>
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(doc.id)}
                  onChange={() => toggleOne(doc.id)}
                  aria-label={`Select ${doc.fileName}`}
                />
              </Td>
              <Td>{doc.fileName}</Td>
              <Td>
                <Badge variant="secondary">{doc.category.replaceAll("_", " ")}</Badge>
              </Td>
              <Td>{doc.propertyName || "—"}</Td>
              <Td>{new Date(doc.createdAt).toLocaleDateString()}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Link href={`/api/documents/${doc.id}`} target="_blank">
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </Link>
                  <form action={deleteOne(doc.id)}>
                    <Button type="submit" variant="ghost" size="sm" className="text-danger">
                      Delete
                    </Button>
                  </form>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
