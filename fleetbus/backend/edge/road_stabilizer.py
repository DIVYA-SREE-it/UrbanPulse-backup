from collections import defaultdict


class RoadDetectionStabilizer:
    def __init__(
        self,
        confirm_frames=3,
        max_history=5,
        max_stale_frames=7,
        iou_threshold=0.20,
    ):
        self.confirm_frames = confirm_frames
        self.max_history = max_history
        self.max_stale_frames = max_stale_frames
        self.iou_threshold = iou_threshold

        self.frame_number = 0
        self.next_track_id = 1
        self.tracks = []


    @staticmethod
    def iou(a, b):
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b

        ix1 = max(ax1, bx1)
        iy1 = max(ay1, by1)
        ix2 = min(ax2, bx2)
        iy2 = min(ay2, by2)

        iw = max(0.0, ix2 - ix1)
        ih = max(0.0, iy2 - iy1)

        intersection = iw * ih

        area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
        area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)

        union = area_a + area_b - intersection

        if union <= 0:
            return 0.0

        return intersection / union


    def update(self, detections):
        self.frame_number += 1
        used_tracks = set()

        for detection in detections:
            best_track_index = None
            best_iou = 0.0

            for index, track in enumerate(self.tracks):
                if index in used_tracks:
                    continue

                overlap = self.iou(
                    detection["xyxy"],
                    track["bbox"],
                )

                if overlap > best_iou:
                    best_iou = overlap
                    best_track_index = index

            observation = {
                "class_name": detection["class_name"],
                "raw_class_name": detection.get(
                    "raw_class_name",
                    detection["class_name"],
                ),
                "confidence": float(detection["confidence"]),
                "xyxy": detection["xyxy"],
            }

            if (
                best_track_index is not None
                and best_iou >= self.iou_threshold
            ):
                track = self.tracks[best_track_index]

                track["bbox"] = detection["xyxy"]
                track["last_seen"] = self.frame_number
                track["hits"] += 1
                track["history"].append(observation)
                track["history"] = track["history"][-self.max_history:]

                used_tracks.add(best_track_index)

            else:
                self.tracks.append(
                    {
                        "track_id": self.next_track_id,
                        "bbox": detection["xyxy"],
                        "last_seen": self.frame_number,
                        "hits": 1,
                        "history": [observation],
                    }
                )

                self.next_track_id += 1


        active_tracks = []
        stabilized = []

        for track in self.tracks:
            age = self.frame_number - track["last_seen"]

            if age > self.max_stale_frames:
                continue

            active_tracks.append(track)

            if track["last_seen"] != self.frame_number:
                continue

            if track["hits"] < self.confirm_frames:
                continue

            scores = defaultdict(float)

            for observation in track["history"]:
                scores[observation["class_name"]] += observation["confidence"]

            stable_class = max(scores, key=scores.get)

            supporting = [
                observation
                for observation in track["history"]
                if observation["class_name"] == stable_class
            ]

            stable_confidence = sum(
                observation["confidence"]
                for observation in supporting
            ) / len(supporting)

            latest = track["history"][-1]

            stabilized.append(
                {
                    "class_name": stable_class,
                    "raw_class_name": latest["raw_class_name"],
                    "confidence": stable_confidence,
                    "track_id": track["track_id"],
                    "xyxy": track["bbox"],
                    "support_frames": track["hits"],
                }
            )

        self.tracks = active_tracks

        return stabilized
