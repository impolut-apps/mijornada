export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="listrow" style={{ cursor: "default" }}>
          <div className="sk sk-ico" />
          <div className="grow">
            <div className="sk sk-line" style={{ width: "40%" }} />
            <div className="sk sk-line" style={{ width: "60%", marginTop: 8 }} />
            <div className="sk sk-line" style={{ width: "50%", marginTop: 8, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="sk sk-line" style={{ width: "50%" }} />
      <div className="sk sk-line" style={{ width: "80%", marginTop: 10 }} />
      <div className="sk sk-line" style={{ width: "70%", marginTop: 10 }} />
    </div>
  );
}
