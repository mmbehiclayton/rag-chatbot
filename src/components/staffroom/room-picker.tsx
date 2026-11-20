"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { GENERAL_ROOM } from "@/lib/staffroom";

/** Switch rooms: General, then the teacher's own learning areas, then the rest. */
export function RoomPicker({
  room,
  mine,
  others,
}: {
  room: string;
  mine: string[];
  others: string[];
}) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Label htmlFor="staffroom-room">Room</Label>
      <NativeSelect
        id="staffroom-room"
        value={room}
        onChange={(e) =>
          router.push(
            `/dashboard/staffroom?room=${encodeURIComponent(e.target.value)}`,
          )
        }
        className="w-full sm:w-80"
      >
        <NativeSelectOption value={GENERAL_ROOM}>
          General: all teachers
        </NativeSelectOption>
        {mine.length > 0 && (
          <NativeSelectOptGroup label="Your learning areas">
            {mine.map((r) => (
              <NativeSelectOption key={r} value={r}>
                {r}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        )}
        <NativeSelectOptGroup label="Other learning areas">
          {others.map((r) => (
            <NativeSelectOption key={r} value={r}>
              {r}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  );
}
