type StatCardProps = {
    label: string;
    value: string;
    description: string;
};

export function StatCard({
    label,
    value,
    description,
}: StatCardProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {description}
            </p>
        </div>
    );
}