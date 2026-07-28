type Props = {
  children: React.ReactNode;
  onClose: () => void;
};

export default function PropertyModal({
  children,
  onClose,
}: Props) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}