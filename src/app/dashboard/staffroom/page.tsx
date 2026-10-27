import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsQueue } from "@/components/staffroom/reports-queue";
import { RoomPicker } from "@/components/staffroom/room-picker";
import { StaffroomChat } from "@/components/staffroom/staffroom-chat";
import { roomMessages } from "@/lib/actions/staffroom";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { GENERAL_ROOM, roomLabel } from "@/lib/staffroom";

export default async function StaffroomPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const isStaff = session.role === "SUPERADMIN";

  const [areas, me] = await Promise.all([
    withDbRetry(() =>
      db.learningArea.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
    ),
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: session.userId },
        select: { subjectsTaught: true },
      }),
    ),
  ]);
  const names = areas.map((a) => a.name);
  const mine = names.filter((n) => me?.subjectsTaught.includes(n));
  const others = names.filter((n) => !mine.includes(n));

  const { room: asked } = await searchParams;
  const room = asked && names.includes(asked) ? asked : GENERAL_ROOM;

  const [initial, reported] = await Promise.all([
    roomMessages({ room }),
    isStaff
      ? withDbRetry(() =>
          db.staffroomMessage.findMany({
            where: {
              removedAt: null,
              reports: { some: { resolvedAt: null } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              room: true,
              body: true,
              userId: true,
              user: { select: { name: true } },
              _count: {
                select: { reports: { where: { resolvedAt: null } } },
              },
            },
          }),
        )
      : [],
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Staffroom"
        description="Talk with teachers across Kenya: ask questions, share what worked in class and help each other."
      />

      {reported.length > 0 && (
        <ReportsQueue
          items={reported.map((m) => ({
            id: m.id,
            room: m.room,
            body: m.body,
            author: m.user.name?.trim() || "A teacher",
            authorId: m.userId,
            reports: m._count.reports,
          }))}
        />
      )}

      <RoomPicker room={room} mine={mine} others={others} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">{roomLabel(room)}</h2>
        {/* key: a new room starts with its own messages */}
        <StaffroomChat
          key={room}
          room={room}
          initial={initial}
          isStaff={isStaff}
        />
        <p className="text-xs text-muted-foreground">
          Be kind and stay on teaching. No adverts or money requests; share jobs
          on the Jobs page. Tap the flag on any message that breaks these rules
          and Elimu staff will look at it.
        </p>
      </section>
    </div>
  );
}
