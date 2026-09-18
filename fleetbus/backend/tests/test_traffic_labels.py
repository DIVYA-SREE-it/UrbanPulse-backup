import unittest
from edge.traffic_labels import canonical_name, selected_class_ids, vehicle_count, inference_settings


class TestTrafficLabels(unittest.TestCase):
    def test_dadis_ids_are_not_coco_ids(self):
        names = dict(enumerate(['Bus','Traffic Light','Traffic Sign','Person','Bike','Truck','Motor','Car','Train','Rider']))
        self.assertEqual(selected_class_ids(names), list(range(10)))
        self.assertEqual(canonical_name(names[4]), 'bicycle')
        self.assertEqual(canonical_name(names[6]), 'motorcycle')
        self.assertEqual(canonical_name(names[1]), 'traffic light')

    def test_coco_filter_does_not_select_unrelated_objects(self):
        names = {0:'person',1:'bicycle',2:'car',3:'motorcycle',5:'bus',6:'train',7:'truck',9:'traffic light',11:'stop sign',56:'chair'}
        self.assertEqual(selected_class_ids(names), [0,1,2,3,5,6,7,9,11])

    def test_rider_and_context_do_not_inflate_road_vehicle_count(self):
        self.assertEqual(vehicle_count({'car':2,'motorcycle':1,'rider':1,'person':4,'train':1,'traffic sign':3}), 3)

    def test_unknown_taxonomy_rejected(self):
        with self.assertRaises(ValueError): selected_class_ids({0:'pothole',1:'crack'})

    def test_traffic_overrides_do_not_mutate_road_settings(self):
        cfg = {'confidence':0.35,'imgsz':416}
        self.assertEqual(inference_settings(cfg, {'TRAFFIC_CONFIDENCE':'0.18','TRAFFIC_IMGSZ':'640'}), (0.18,640))
        self.assertEqual(cfg, {'confidence':0.35,'imgsz':416})
        for invalid in ('nan','0','1.1'):
            with self.assertRaises(ValueError): inference_settings(cfg, {'TRAFFIC_CONFIDENCE':invalid})
        with self.assertRaises(ValueError): inference_settings(cfg, {'TRAFFIC_IMGSZ':'416.5'})
