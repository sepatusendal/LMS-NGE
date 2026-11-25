"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, ArrowLeft, CopyPlus, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { DocumentManager } from "@/features/policies/admin/document-manager";
import { MonitorTable } from "@/features/policies/admin/monitor-table";
import { PacketForm } from "@/features/policies/admin/packet-form";
import {
  useArchivePacket,
  useCreatePacketVersion,
  useDeleteDraftPacket,
  usePacketAdmin,
  usePublishPacket,
  useUpdatePacket,
} from "@/features/policies/use-policies";
import type { PolicyDocument, PolicyPacket } from "@/features/policies/schema";

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("admin.policies");
  const { data, isLoading, isError, error } = usePacketAdmin(id);

  return (
    <div className="space-y-4">
      <Link href="/policies" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      {isLoading && <LoadingState />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}
      {data && <PolicyDetail packet={data.packet} documents={data.documents} />}
    </div>
  );
}

type PendingAction = "publish" | "archive" | "delete" | null;

function PolicyDetail({ packet, documents }: { packet: PolicyPacket; documents: PolicyDocument[] }) {
  const t = useTranslations("admin.policies");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const update = useUpdatePacket(packet);
  const publish = usePublishPacket();
  const archive = useArchivePacket();
  const newVersion = useCreatePacketVersion();
  const deleteDraft = useDeleteDraftPacket();
  const [action, setAction] = useState<PendingAction>(null);
  const isDraft = packet.status === "DRAFT";
  const busy = publish.isPending || archive.isPending || deleteDraft.isPending;

  function runAction() {
    const close = { onSettled: () => setAction(null) };
    if (action === "publish") publish.mutate(packet.id, close);
    if (action === "archive") archive.mutate(packet.id, close);
    if (action === "delete") {
      deleteDraft.mutate(packet.id, { ...close, onSuccess: () => router.push("/policies") });
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{packet.title}</h1>
        <Badge variant="outline">{t("version", { version: packet.version })}</Badge>
        <Badge variant={packet.status === "PUBLISHED" ? "default" : "secondary"}>{t(`status.${packet.status}`)}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {isDraft ? (
            <>
              <Button variant="outline" onClick={() => setAction("delete")}>
                <Trash2 className="size-4" />
                {t("actions.delete")}
              </Button>
              <Button disabled={documents.length === 0} onClick={() => setAction("publish")}>
                <Send className="size-4" />
                {t("actions.publish")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={newVersion.isPending}
                onClick={() => newVersion.mutate(packet.id, { onSuccess: (id) => router.push(`/policies/${id}`) })}
              >
                <CopyPlus className="size-4" />
                {t("actions.newVersion")}
              </Button>
              {packet.status === "PUBLISHED" && (
                <Button variant="outline" onClick={() => setAction("archive")}>
                  <Archive className="size-4" />
                  {t("actions.archive")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isDraft && <p className="bg-chart-4/10 text-chart-4 rounded-lg px-3 py-2 text-sm">{t("draftNotice")}</p>}

      {!isDraft && (
        <Card>
          <CardHeader>
            <CardTitle>{t("monitor.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonitorTable packet={packet} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("documents.heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentManager packetId={packet.id} documents={documents} editable={isDraft} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PacketForm
            packet={packet}
            submitLabel={t("save")}
            isPending={update.isPending}
            onSubmit={(values) => update.mutate(values)}
          />
        </CardContent>
      </Card>

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>{t(`confirm.${action}Title`)}</DialogTitle>
                <DialogDescription>{t(`confirm.${action}Body`)}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAction(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button variant={action === "publish" ? "default" : "destructive"} disabled={busy} onClick={runAction}>
                  {t(`actions.${action}`)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
