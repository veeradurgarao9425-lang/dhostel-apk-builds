import os
from PIL import Image
import numpy as np

def generate_hostix_colored_and_monochrome_icons():
    app_icon_path = r'c:\dhostel-main\mobile\assets\HostixNew.png'
    img = Image.open(app_icon_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)

    # 1. Identify non-white emblem pixels from HostixNew.png (background is near-white #FDFDFD)
    diff = 255.0 - (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / 3.0
    alpha = np.clip(diff / 18.0 * 255.0, 0, 255).astype(np.uint8)

    coords = np.argwhere(alpha > 20)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)

    # Crop to emblem
    emblem_rgb = arr[y0:y1 + 1, x0:x1 + 1, :3].astype(np.uint8)
    emblem_alpha = alpha[y0:y1 + 1, x0:x1 + 1]

    h, w = emblem_alpha.shape
    max_dim = max(h, w)
    pad = int(max_dim * 0.10)
    total_dim = max_dim + 2 * pad

    # ── FULL COLOR ICON (preserves the original purple & teal app theme colors!) ──
    colored_arr = np.zeros((total_dim, total_dim, 4), dtype=np.uint8)
    oy = pad + (max_dim - h) // 2
    ox = pad + (max_dim - w) // 2
    colored_arr[oy:oy + h, ox:ox + w, :3] = emblem_rgb
    colored_arr[oy:oy + h, ox:ox + w, 3] = emblem_alpha

    master_colored = Image.fromarray(colored_arr, 'RGBA')

    # ── MONOCHROME SILHOUETTE (for OS status bar alpha mask) ──
    white_rgb = np.full((total_dim, total_dim, 3), 255, dtype=np.uint8)
    white_arr = np.zeros((total_dim, total_dim, 4), dtype=np.uint8)
    white_arr[:, :, :3] = white_rgb
    white_arr[oy:oy + h, ox:ox + w, 3] = emblem_alpha
    master_white = Image.fromarray(white_arr, 'RGBA')

    densities = {
        'drawable-mdpi': 24,
        'drawable-hdpi': 36,
        'drawable-xhdpi': 48,
        'drawable-xxhdpi': 72,
        'drawable-xxxhdpi': 96,
    }

    base_res = r'c:\dhostel-main\mobile\android\app\src\main\res'

    for folder, sz in densities.items():
        folder_path = os.path.join(base_res, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Save colored notification icon (theme purple/teal)
        out_file = os.path.join(folder_path, 'notification_icon.png')
        resized_color = master_colored.resize((sz, sz), Image.Resampling.LANCZOS)
        resized_color.save(out_file, 'PNG')

        # Save white silhouette fallback
        out_white = os.path.join(folder_path, 'notification_icon_white.png')
        resized_white = master_white.resize((sz, sz), Image.Resampling.LANCZOS)
        resized_white.save(out_white, 'PNG')

        print(f"Saved {folder}/notification_icon.png (colored with app theme purple/teal) {sz}x{sz}")

    # Also save to assets/notification-icon.png
    assets_file = r'c:\dhostel-main\mobile\assets\notification-icon.png'
    resized_asset = master_colored.resize((96, 96), Image.Resampling.LANCZOS)
    resized_asset.save(assets_file, 'PNG')
    print(f"Saved Expo asset {assets_file} (colored 96x96)")

if __name__ == '__main__':
    generate_hostix_colored_and_monochrome_icons()
