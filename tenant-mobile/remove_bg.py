
from rembg import remove
from PIL import Image

input_path = r'C:\Users\RNIT\.gemini\antigravity-ide\brain\06ab96d7-a10d-45ba-b585-19b08f8785ee\media__1782847778066.jpg'
output_path = r'C:\dhostel-main\tenant-mobile\assets\wallet_3d.png'

try:
    input_image = Image.open(input_path)
    # The image is a fake checkerboard transparent image. rembg should identify the wallet and remove everything else.
    output_image = remove(input_image)
    output_image.save(output_path, format='PNG')
    print('Successfully removed background and saved to ' + output_path)
except Exception as e:
    print('Error: ' + str(e))

