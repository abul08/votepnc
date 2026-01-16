"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { importVotersAction } from "./actions";

const initialState = {};

export function ImportForm() {
  const [state, action, isPending] = useActionState(importVotersAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">CSV import</h2>
        <p className="text-sm text-slate-600">
          Columns: sumaaru, name, address, phone, sex, nid, present_location,
          registered_box, job_in, job_by.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Input name="file" type="file" accept=".csv" required />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Uploading..." : "Upload CSV"}
          </Button>
          {state?.message && (
            <p className="text-sm text-slate-600">
              {state.message}{" "}
              {state.inserted !== undefined && `Inserted: ${state.inserted}.`}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
