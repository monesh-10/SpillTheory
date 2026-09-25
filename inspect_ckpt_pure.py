import zipfile
import pickle

with zipfile.ZipFile('models/sar/best_model_epoch19.pt', 'r') as z:
    for f in z.namelist():
        if f.endswith('data.pkl'):
            with z.open(f) as pkl_file:
                class DummyUnpickler(pickle.Unpickler):
                    def find_class(self, module, name):
                        if module == 'torch.storage' and name == '_load_from_bytes':
                            return lambda b: b'dummy'
                        return super().find_class(module, name)
                
                try:
                    data = DummyUnpickler(pkl_file).load()
                    print('Keys:', data.keys())
                    print('Norm info:', data.get('norm_info'))
                except Exception as e:
                    print('Error:', e)
