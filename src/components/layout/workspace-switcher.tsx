import { switchWorkspace } from "@/lib/actions/workspace";
import { cn } from "@/lib/utils";
import { type Workspace, workspaceLabel } from "./nav-config";

/** Two buttons for admins and staff: their own menus, or the teacher's. */
export function WorkspaceSwitcher({
  role,
  current,
  className,
}: {
  role: string | null;
  current: Workspace;
  className?: string;
}) {
  const options: Workspace[] = ["admin", "teaching"];
  return (
    <fieldset
      className={cn(
        "grid grid-cols-2 gap-1 rounded-md bg-muted p-1",
        className,
      )}
    >
      <legend className="sr-only">Switch menus</legend>
      {options.map((w) => (
        <form key={w} action={switchWorkspace.bind(null, w)}>
          <button
            type="submit"
            aria-pressed={w === current}
            className={cn(
              "h-11 w-full truncate rounded-md px-2 text-xs font-medium transition-colors",
              w === current
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {workspaceLabel(w, role)}
          </button>
        </form>
      ))}
    </fieldset>
  );
}
