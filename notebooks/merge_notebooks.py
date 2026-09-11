import nbformat
from pathlib import Path

notebook_files = [
    Path("notebooks/02_shared_splitting.ipynb"),
    Path("notebooks/03_fare_model_comparison_nadeesha.ipynb"),
    Path("notebooks/04_fare_model_comparison_additional.ipynb"),
    Path("notebooks/05_eta_model.ipynb"),
]

merged = nbformat.v4.new_notebook()
merged.cells = []

for notebook_file in notebook_files:
    with notebook_file.open("r", encoding="utf-8") as file:
        notebook = nbformat.read(file, as_version=4)

    merged.cells.extend(notebook.cells)

output_file = Path("notebooks/DataHeists_FinalNotebook.ipynb")

with output_file.open("w", encoding="utf-8") as file:
    nbformat.write(merged, file)

print("Created:", output_file)