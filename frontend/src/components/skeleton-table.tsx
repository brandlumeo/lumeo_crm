export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-line-2 text-left">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-5 py-3">
                <div className="h-3 w-16 bg-line-2/50 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIndex) => (
            <tr key={rIndex} className="border-b border-line-2 last:border-b-0">
              {Array.from({ length: columns }).map((_, cIndex) => (
                <td key={cIndex} className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-3/4 bg-bone-2 rounded animate-pulse" />
                    {cIndex === 0 && (
                      <div className="h-3 w-1/2 bg-bone-2/60 rounded animate-pulse" />
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
