"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface CreateUserFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export function CreateUserForm({ action }: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      const result = await action(formData);
      
      if (result?.error) {
        toast.error("Failed to create user", {
          description: result.error,
        });
      } else {
        toast.success("User created successfully");
        form.reset();
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
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Input 
        name="username" 
        type="text" 
        placeholder="Admin username" 
        pattern="^[a-zA-Z0-9_]+$"
        title="Only letters, numbers, and underscores"
        required 
        disabled={isLoading}
        className="h-11 sm:h-9"
      />
      <Input 
        name="password" 
        type="password" 
        placeholder="Password (min 6 chars)" 
        required 
        minLength={6}
        disabled={isLoading}
        className="h-11 sm:h-9"
      />
      <input type="hidden" name="role" value="admin" />
      <Button type="submit" disabled={isLoading} className="h-11 sm:h-9">
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span>Creating...</span>
          </>
        ) : (
          "Add Admin"
        )}
      </Button>
    </form>
  );
}
