import torch
ckpt = torch.load('models/sar/best_model_epoch19.pt', map_location='cpu', weights_only=False)
print('Keys:', ckpt.keys())
print('Norm info:', ckpt.get('norm_info', None))
if 'model' in ckpt:
    print('Model keys (first 10):', list(ckpt['model'].keys())[:10])
