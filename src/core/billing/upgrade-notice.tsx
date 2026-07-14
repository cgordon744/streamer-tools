// Shown when hasAccess() denies a tool. Unreachable while the entitlement
// stub grants everything; exists so gating a tool later is purely a change
// in entitlements.ts.
export function UpgradeNotice({ toolName }: { toolName: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <p className="text-foreground text-sm font-medium">
        {toolName} isn&apos;t part of your plan
      </p>
      <p className="max-w-sm text-sm">
        Upgrade your subscription to use this tool.
      </p>
    </div>
  );
}
