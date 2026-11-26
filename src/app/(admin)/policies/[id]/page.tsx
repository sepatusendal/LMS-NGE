"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, ArrowLeft, CopyPlus, Send, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { pickRecipients } from "@/features/policies/audience";
import { formatDateTime } from "@/features/policies/format";
import type { PacketDetail } from "@/features/policies/queries";
import {
  useArchivePacket,
  useAudiencePeople,
  useCreatePacketVersion,
  useDeleteDraftPacket,
  usePacketAdmin,
  usePublishPacket,
  useUpdatePacket,
} from "@/features/policies/use-policies";

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
      {data && <PolicyDetail {...data} />}
    </div>
  );
}

/** Who changed the recipients after publishing, and to what. */
function AudienceHistory({ changes }: { changes: PacketDetail["audienceChanges"] }) {
  const t = useTranslations("admin.policies.history");
  const tAudience = useTranslations("admin.policies.form.audience");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {changes.map((change) => {
            const { roles, includedUserIds, excludedUserIds } = change.after;
            const summary = [
              roles.map((role) => tAudience(`role.${role}`)).join(", ") || null,
              includedUserIds.length > 0 ? t("included", { count: includedUserIds.length }) : null,
              excludedUserIds.length > 0 ? t("excluded", { count: excludedUserIds.length }) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={change.id} className="py-2">
                <p>{summary}</p>
                <p className="text-muted-foreground text-xs">
                  {t("by", {
                    name: change.changedByName ?? "-",
                    date: formatDateTime(change.changedAt, locale),
                  })}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

type PendingAction = "publish" | "archive" | "delete" | null;

function PolicyDetail({ packet, documents, audience, audienceChanges }: PacketDetail) {
  const t = useTranslations("admin.policies");
  const { data: people } = useAudiencePeople();
  const recipientCount = people ? pickRecipients(audience, people).length : 0;
  const tCommon = useTranslations("common");
  const router = useRouter();
  const update = useUpdatePacket(packet);
  const publish = usePublishPacket();
  const archive = useArchivePacket();
  const newVersion = useCreatePacketVersion();
  const deleteDraft = useDeleteDraftPacket();
  const [action, setAction] = useState<PendingAction>(null);
  const [unsaved, setUnsaved] = useState(false);
  const isDraft = packet.status === "DRAFT";
  // Publishing takes what is saved and cannot be undone, so say what is missing.
  const publishBlocker =
    documents.length === 0
      ? "documents"
      : unsaved
        ? "unsaved"
        : people && recipientCount === 0
          ? "recipients"
          : null;
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
              <Button disabled={publishBlocker !== null || !people} onClick={() => setAction("publish")}>
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
      {isDraft && publishBlocker && (
        <p role="status" className="text-muted-foreground text-sm">
          {t(`publishBlocked.${publishBlocker}`)}
        </p>
      )}

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
            audience={audience}
            submitLabel={t("save")}
            isPending={update.isPending}
            onSubmit={(values) => update.mutate(values)}
            onDirtyChange={setUnsaved}
          />
        </CardContent>
      </Card>

      {audienceChanges.length > 0 && <AudienceHistory changes={audienceChanges} />}

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>{t(`confirm.${action}Title`)}</DialogTitle>
                <DialogDescription>{t(`confirm.${action}Body`, { count: recipientCount })}</DialogDescription>
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
