"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateVoterFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export function CreateVoterForm({ action }: CreateVoterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      const result = await action(formData);
      
      if (result?.error) {
        toast.error("Failed to add voter", {
          description: result.error,
        });
      } else {
        toast.success("Voter added successfully");
        form.reset();
        setIsExpanded(false);
      }
    } catch (err) {
      toast.error("An error occurred", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Add Voter</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden"
          >
            {isExpanded ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
        <form onSubmit={handleSubmit} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Input name="sumaaru" placeholder="Sumaaru" required disabled={isLoading} className="h-11 sm:h-9" />
          <Input name="name" placeholder="Full name" required disabled={isLoading} className="h-11 sm:h-9" />
          <Input name="phone" placeholder="Phone" disabled={isLoading} className="h-11 sm:h-9" />
          <Input name="address" placeholder="Address" disabled={isLoading} className="h-11 sm:h-9" />
          <select
            name="sex"
            disabled={isLoading}
            className="h-11 sm:h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Sex</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
          <Input name="nid" placeholder="NID" disabled={isLoading} className="h-11 sm:h-9" />
          <Input name="present_location" placeholder="Present location" disabled={isLoading} className="h-11 sm:h-9" />
          <select
            name="registered_box"
            disabled={isLoading}
            className="h-11 sm:h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Registered box</option>
            <option value="C14.1">C14.1</option>
            <option value="C14.2">C14.2</option>
          </select>
          <Input name="job_in" placeholder="Job in" disabled={isLoading} className="h-11 sm:h-9" />
          <Input name="job_by" placeholder="Job by" disabled={isLoading} className="h-11 sm:h-9" />
          <Button type="submit" disabled={isLoading} className="col-span-2 sm:col-span-3 lg:col-span-5 h-11 sm:h-9">
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              "Save voter"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
