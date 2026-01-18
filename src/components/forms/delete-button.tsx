"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  itemId: string;
  itemName?: string;
  inputName?: string;
}

export function DeleteButton({ 
  action, 
  itemId, 
  itemName = "item",
  inputName = "id"
}: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append(inputName, itemId);
    
    try {
      const result = await action(formData);
      
      if (result?.error) {
        toast.error(`Failed to delete ${itemName}`, {
          description: result.error,
        });
      } else {
        toast.success(`${itemName} deleted successfully`);
      }
    } catch (err) {
      toast.error("An error occurred", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? <Spinner size="sm" /> : "Delete"}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {itemName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <><Spinner size="sm" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
