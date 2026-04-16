import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Paperclip, Receipt, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TimeEntryResponse, TicketAttachmentResponse, timeEntryService } from "@/services/timeEntryService";

interface TicketAttachmentsMenuProps {
  entryId: string;
  attachments: TicketAttachmentResponse[];
  canManage?: boolean;
  onEntryUpdated?: (entry: TimeEntryResponse) => void;
}

export function TicketAttachmentsMenu({
  entryId,
  attachments,
  canManage = false,
  onEntryUpdated,
}: TicketAttachmentsMenuProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localAttachments, setLocalAttachments] = useState<TicketAttachmentResponse[]>(attachments);

  useEffect(() => {
    setLocalAttachments(attachments);
  }, [attachments]);

  const sortedAttachments = useMemo(
    () =>
      [...localAttachments].sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      ),
    [localAttachments]
  );

  const syncEntry = (entry: TimeEntryResponse) => {
    setLocalAttachments(entry.ticket_attachments || []);
    onEntryUpdated?.(entry);
    queryClient.invalidateQueries({ queryKey: ["allTimeEntries"] });
    queryClient.invalidateQueries({ queryKey: ["myEntries"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let updatedEntry: TimeEntryResponse | null = null;
      for (const file of files) {
        updatedEntry = await timeEntryService.uploadTicketPhoto(entryId, file);
      }
      return updatedEntry;
    },
    onSuccess: (entry) => {
      if (entry) {
        syncEntry(entry);
      }
      toast.success("Ticket adjunto correctamente");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al subir el ticket");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => timeEntryService.deleteTicketAttachment(entryId, attachmentId),
    onSuccess: (entry) => {
      syncEntry(entry);
      toast.success("Ticket eliminado");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al eliminar el ticket");
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    await uploadMutation.mutateAsync(files);
    event.target.value = "";
  };

  const openAttachment = (filePath: string) => {
    window.open(filePath, "_blank", "noopener,noreferrer");
  };

  const ticketCount = sortedAttachments.length;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8 text-primary hover:bg-primary/10">
            <Receipt className="h-4 w-4" />
            {ticketCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {ticketCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Tickets adjuntos
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedAttachments.length === 0 ? (
            <DropdownMenuItem disabled>No hay tickets subidos</DropdownMenuItem>
          ) : (
            sortedAttachments.map((attachment, index) => (
              <DropdownMenuSub key={attachment.id}>
                <DropdownMenuSubTrigger>
                  Ticket {index + 1}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuItem onSelect={() => openAttachment(attachment.file_path)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled
                    className="text-xs text-muted-foreground opacity-100 focus:bg-transparent focus:text-muted-foreground"
                  >
                    {attachment.original_filename || attachment.file_path.split("/").pop()}
                  </DropdownMenuItem>
                  {canManage && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => deleteMutation.mutate(attachment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ticket
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          )}
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={uploadMutation.isPending}
                onSelect={(event) => {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir ticket
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
