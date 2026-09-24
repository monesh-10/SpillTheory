# SpillTheory Data Directory

This directory organizes data assets across samples and generated runtime outputs.

## Directory Structure

```
data/
├── README.md           # Data directory documentation
├── samples/            # Small input sample files for testing and verification
│   └── README.md
└── outputs/            # Ephemeral generated prediction masks and inference outputs
    └── README.md
```

## Policy

- **Samples (`data/samples/`)**: Reserved for small, public or benchmark input files used for local automated tests and offline demonstrations. Do not commit large (>10MB) satellite archives or private customer data.
- **Outputs (`data/outputs/`)**: Stores runtime-generated files such as colormapped prediction masks, confidence maps, and exported reports. All generated images inside `data/outputs/` are ignored by Git.
