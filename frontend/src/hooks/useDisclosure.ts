import { useState } from "react";

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);

  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    onToggle: () => setOpen((prev) => !prev)
  };
}