"""Create a separate original-UI fleetbus copy and import existing local camera assets."""
import argparse
import json
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('existing_project', type=Path)
    parser.add_argument('--destination', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = args.existing_project.expanduser().resolve()
    destination = (args.destination.expanduser().resolve() if args.destination
                   else source.parent / 'fleetbus-dadis')
    bundle = Path(__file__).resolve().parent / 'fleetbus'
    if destination.exists():
        raise SystemExit(f'Destination already exists; no files changed: {destination}')
    if source == destination or source in destination.parents:
        raise SystemExit('Use a separate sibling directory, outside the existing project.')
    if not (source / 'package.json').is_file():
        raise SystemExit('Select your existing fleetbus root.')
    config = json.loads((source / 'backend/edge/config.json').read_text())
    assets = {}
    for key, target in [('road_model','models/best.pt'), ('road_video','videos/road.mp4'),
                        ('traffic_video','videos/traffic.mp4')]:
        path = Path(config[key]).expanduser()
        if not path.is_absolute(): path = source / 'backend' / path
        if not path.is_file():
            raise SystemExit(f'Missing {key}: {path}. Nothing changed.')
        assets[target] = path
    print('Original UI source:', bundle)
    print('New project:', destination)
    for target, path in assets.items(): print('Import:', path, '->', target)
    print('Traffic detector: packaged COCO YOLOv8n fallback, NOT DADIS trained weights.')
    print('Existing project and its data are not modified. The new copy starts its own database.')
    if args.check: return
    if not destination.parent.is_dir():
        raise SystemExit('Destination parent must already exist.')
    try:
        shutil.copytree(bundle, destination, ignore=shutil.ignore_patterns('__pycache__','node_modules','dist'))
        for target, path in assets.items():
            output = destination / 'backend' / target
            output.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, output)
    except Exception:
        print('Creation incomplete. Existing project is untouched. Check the partially created destination.')
        raise
    print('Created:', destination)
    print('Use your existing Python environment. Install frontend dependencies in the new directory.')


if __name__ == '__main__':
    main()
