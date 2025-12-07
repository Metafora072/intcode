import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });

const getCroppedBlob = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布上下文");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("裁剪失败"));
    }, "image/png");
  });
};

const AvatarCropModal = ({ isOpen, imageSrc, loading, onClose, onConfirm }: AvatarCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    await onConfirm(blob);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">裁剪头像</h3>
        <div className="relative h-72 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">缩放</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "保存中..." : "保存头像"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
