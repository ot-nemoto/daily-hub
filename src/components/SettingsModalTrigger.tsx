"use client";

import { useState } from "react";

import { SettingsModal } from "./SettingsModal";

type Props = {
  name: string;
  email: string;
  hasInitialApiKey: boolean;
};

export function SettingsModalTrigger({ name, email, hasInitialApiKey }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 sm:inline"
      >
        {name}
      </button>
      {open && (
        <SettingsModal
          initialName={name}
          email={email}
          hasInitialApiKey={hasInitialApiKey}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
