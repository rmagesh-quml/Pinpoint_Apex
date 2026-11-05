/** Required on every screen. `inline` puts it in the layout flow (phone). */
export function DemoLabel({ inline = false }: { inline?: boolean }) {
  return <div className={`demo-label${inline ? ' inline' : ''}`}>Showcase demo, not for patient care</div>;
}
