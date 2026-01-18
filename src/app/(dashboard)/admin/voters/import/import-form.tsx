"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { importVotersAction } from "./actions";

export function ImportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; inserted?: number } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      const res = await importVotersAction({}, formData);
      setResult(res);
      
      if (res.success) {
        toast.success("Import successful", {
          description: `${res.inserted} voters imported.`,
        });
        form.reset();
      } else {
        toast.error("Import failed", {
          description: res.message,
        });
      }
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">CSV Import</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Upload a CSV with columns: sumaaru, name, address, phone, sex, nid, present_location, registered_box, job_in, job_by
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input 
              id="file" 
              name="file" 
              type="file" 
              accept=".csv" 
              required 
              disabled={isLoading}
              className="h-11 sm:h-9"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-11 sm:h-9">
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Uploading...</span>
              </>
            ) : (
              "Upload CSV"
            )}
          </Button>
          
          {result && (
            <Alert variant={result.success ? "success" : "destructive"}>
              <AlertDescription>
                {result.message}
                {result.inserted !== undefined && ` Inserted: ${result.inserted} records.`}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
