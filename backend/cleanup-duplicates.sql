-- Cleanup Script: Delete Duplicate Attendance Records
-- Generated: 2026-09-25T18:32:38.341Z
-- Strategy: Keep earliest record per user per day, delete rest

-- Ali sobirin (800785) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:26:29.470Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'e8b5f638-e793-4fe5-8d0f-2e164a87b220'; -- 2026-09-23T23:27:52.350Z

-- Rafi (123456) on 2026-09-25
-- Total scans: 15, Keeping first at 2026-09-25T06:19:05.312Z
-- Deleting 14 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'd11b27f6-a732-4a70-b1e1-8fb6ad3aa4ae'; -- 2026-09-25T06:30:49.801Z
DELETE FROM attendance_logs WHERE id = '29fbf4e7-9fb5-4d78-8462-e5f19555c21e'; -- 2026-09-25T06:30:57.752Z
DELETE FROM attendance_logs WHERE id = '3dc520cb-1628-4f75-a528-34dc5ee89c5f'; -- 2026-09-25T06:31:51.747Z
DELETE FROM attendance_logs WHERE id = '496d1bd2-1fb3-440f-8b31-e72fd11dc866'; -- 2026-09-25T06:32:00.697Z
DELETE FROM attendance_logs WHERE id = '3edcc4aa-5ca9-4ba0-a4bf-4b64a24e2567'; -- 2026-09-25T06:32:09.142Z
DELETE FROM attendance_logs WHERE id = '85720268-b360-46a7-a8e1-93d8cc1c74d4'; -- 2026-09-25T06:32:25.819Z
DELETE FROM attendance_logs WHERE id = 'f4e34eb9-f138-4747-9148-08d4d572f747'; -- 2026-09-25T07:37:58.500Z
DELETE FROM attendance_logs WHERE id = '9a7a7557-dcd2-4c62-b268-414499fe3eb2'; -- 2026-09-25T07:38:21.131Z
DELETE FROM attendance_logs WHERE id = '4cfb3491-00c3-4ab7-a2e4-af5dae32e206'; -- 2026-09-25T07:38:30.875Z
DELETE FROM attendance_logs WHERE id = '0b19c042-485e-490d-adc1-61588761971d'; -- 2026-09-25T07:38:40.174Z
DELETE FROM attendance_logs WHERE id = 'b6c0e3e1-2572-41cf-91eb-360588fb2d23'; -- 2026-09-25T07:40:40.715Z
DELETE FROM attendance_logs WHERE id = 'c0fc1b42-45ce-4f72-b017-e19387e69017'; -- 2026-09-25T08:13:44.198Z
DELETE FROM attendance_logs WHERE id = 'c60f503e-4dd1-4cf6-acf6-e2dab717781f'; -- 2026-09-25T08:21:41.396Z
DELETE FROM attendance_logs WHERE id = '9ad1df15-8892-4b36-9995-62fa44d62766'; -- 2026-09-25T08:26:20.262Z

-- AHMAD MUFIDUS SALAM (1171198) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T23:11:35.463Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'a69dfd66-12a0-4461-9b1e-c25f6d25073b'; -- 2026-09-23T23:11:43.537Z
DELETE FROM attendance_logs WHERE id = '953b67c9-ab79-4c57-aca6-629d5c06a2fb'; -- 2026-09-23T23:12:29.467Z

-- Mochammad hadi subrianto (1329253) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:49:20.891Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '57505b6e-afc7-48fe-97ea-654f939df804'; -- 2026-09-23T23:49:38.559Z

-- IMAM SAFI'I (613954) on 2026-09-24
-- Total scans: 5, Keeping first at 2026-09-24T04:26:38.666Z
-- Deleting 4 duplicate(s):
DELETE FROM attendance_logs WHERE id = '73a13da9-81c6-4b47-8cb4-75db02a33212'; -- 2026-09-24T04:27:02.119Z
DELETE FROM attendance_logs WHERE id = '5239adb6-cc50-4f11-a7d7-ca8250744185'; -- 2026-09-24T04:27:12.769Z
DELETE FROM attendance_logs WHERE id = '07900262-6676-4094-b899-b74ce33c0ccc'; -- 2026-09-24T04:27:26.587Z
DELETE FROM attendance_logs WHERE id = '4b37e7ba-f501-4a7a-8a40-5ad29eba66e8'; -- 2026-09-24T04:29:18.253Z

-- Agus triyono (805239) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T09:11:52.592Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '4d5f0143-a4e4-49cb-9eaf-2f121f84136e'; -- 2026-09-24T23:07:28.407Z
DELETE FROM attendance_logs WHERE id = 'af6d526f-aa40-4f41-ba6a-c016af627a2d'; -- 2026-09-24T23:07:47.510Z

-- Mochamad Gufron (847460) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:47:57.564Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '9a299e24-0b44-4ce0-bc51-c73aedc73155'; -- 2026-09-23T23:48:24.374Z

-- DONI KURNIAWAN (1340370) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T04:55:37.084Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '063e6870-1c1c-45eb-9dea-19bf4e60d414'; -- 2026-09-24T05:20:12.937Z

-- TATAG DWI WAHYUDO (540538) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:21:48.365Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '2da50e60-1739-41ed-bad7-ed4600676e0b'; -- 2026-09-23T23:21:56.071Z

-- Muhlisin (1046754) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T23:34:23.779Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '09e723f2-5091-4c50-b2b0-87148083feb3'; -- 2026-09-24T23:35:32.920Z

-- Restu tenggo setyo (1272642) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T23:59:39.465Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '49e80f87-3422-436d-b318-107e245e8267'; -- 2026-09-23T23:59:48.878Z
DELETE FROM attendance_logs WHERE id = 'd4b498dd-8e29-4515-acb1-60d620a87cec'; -- 2026-09-23T23:59:57.945Z

-- A MUIZ ARIFFANDI (1198845) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T06:49:10.691Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '35fae858-d88e-49cd-9a80-59ada7ced42b'; -- 2026-09-24T23:37:10.359Z
DELETE FROM attendance_logs WHERE id = '80d8cf9b-7a2f-453b-bd4f-8762201fc867'; -- 2026-09-24T23:37:32.308Z

-- JULIANTO (1282342) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T01:36:15.117Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '5271c07b-e57b-4b74-8117-e8c247756f76'; -- 2026-09-24T05:24:55.918Z
DELETE FROM attendance_logs WHERE id = '68165a30-6907-424d-b723-7e514a634910'; -- 2026-09-24T05:25:11.971Z

-- MIFTACHUDIN AL ROSYID (303163) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:31:27.692Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'bfe2fd44-c78f-4758-9ecf-831e9317555c'; -- 2026-09-23T23:31:47.690Z

-- Imron Ghofar fahrudi (967173) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T23:32:37.083Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'fab07eae-ae1b-4f64-a7fd-7a1ec033d9cf'; -- 2026-09-23T23:32:49.895Z
DELETE FROM attendance_logs WHERE id = 'd3272bd1-e10d-4638-a5ae-fc10182c6b8e'; -- 2026-09-23T23:35:31.569Z

-- Devin Yoga Prasaja (1286456) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T23:37:42.542Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '5ca90c7e-1a3f-48b6-9f95-b6772c20a465'; -- 2026-09-23T23:37:51.855Z
DELETE FROM attendance_logs WHERE id = '347372d3-f242-4ec9-b37e-b60d6e4a6b68'; -- 2026-09-23T23:38:14.855Z

-- Devin Yoga Prasaja (1286456) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T23:36:17.960Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '0ee8f20c-73dd-4681-ad01-f0b68fee3bf2'; -- 2026-09-24T23:36:27.953Z
DELETE FROM attendance_logs WHERE id = '6d5d6164-bcb5-441e-a2b3-6994a3893a05'; -- 2026-09-24T23:36:39.627Z

-- Nur huda (1128502) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:31:48.704Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '11333a29-cabf-4ab1-b2a3-9af6ff4389f9'; -- 2026-09-23T23:32:02.121Z

-- Nur huda (1128502) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T23:35:12.303Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '55bf4a04-ebd2-4dc9-beb1-67243af8d851'; -- 2026-09-24T23:37:42.290Z

-- Sugiyanto (856169) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:31:55.584Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '80382d60-0987-4613-9d89-941de11cdaf8'; -- 2026-09-23T23:32:03.549Z

-- RIZKY RAMANDHAN (1046722) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:17:34.963Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'd6ef1e06-bff3-483e-913c-83c0135f0649'; -- 2026-09-23T23:17:42.924Z

-- KUSNADI (1337411) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T05:19:57.423Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '838917b3-9689-45ae-85c0-19baa1174643'; -- 2026-09-24T05:20:44.529Z

-- ALI SAFAUDIN (584123) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:31:31.473Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '0cd1f9c5-19cb-481d-8413-64e30855cbb2'; -- 2026-09-23T23:31:53.652Z

-- FIKRI AMIRUDIN AL AMIN (942402) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:56:09.522Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '229a14d5-f428-42b5-b4df-0c6270b09575'; -- 2026-09-23T23:56:25.295Z

-- Miftakhul Huda (499510) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T00:17:37.664Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = '11644ab0-bc94-4666-97a7-eea3f141cc18'; -- 2026-09-24T00:18:21.393Z

-- Abdullah Murtafik (190678) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:24:14.363Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'ab0e6ec7-bb89-4fb2-8b30-37489580d743'; -- 2026-09-23T23:24:27.336Z

-- Wardani (583008) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:40:23.269Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'b9128926-8639-4f58-8338-b816d4821d1a'; -- 2026-09-23T23:40:34.844Z

-- Sofyan mulya pribadi (535130) on 2026-09-24
-- Total scans: 5, Keeping first at 2026-09-24T09:35:28.755Z
-- Deleting 4 duplicate(s):
DELETE FROM attendance_logs WHERE id = '8cb431a8-05ee-44eb-b720-d7c88c10021a'; -- 2026-09-24T09:35:41.612Z
DELETE FROM attendance_logs WHERE id = '10e6ebd6-5b73-442f-aec4-d9d534319e48'; -- 2026-09-24T23:22:57.861Z
DELETE FROM attendance_logs WHERE id = '764488a2-4d0b-4f56-ad23-9d8e024b38fe'; -- 2026-09-24T23:23:22.137Z
DELETE FROM attendance_logs WHERE id = '8ee31255-84f6-4ed9-a5df-6a6e537d80ac'; -- 2026-09-24T23:23:34.028Z

-- AHMAD KHOIRUR ROZIQIN (1324286) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T00:41:46.167Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '66fc08c6-332a-4ce5-8e7e-b09c745f8428'; -- 2026-09-24T00:41:54.770Z
DELETE FROM attendance_logs WHERE id = 'fd8ece6b-70e6-4c03-abd1-3023ea565e6f'; -- 2026-09-24T00:42:13.374Z

-- OBY LUCAN (605936) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T23:34:38.854Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'f6709507-9305-4c16-8dea-d517ae10ad5c'; -- 2026-09-23T23:35:00.538Z

-- Eko Puji Wahyudi (684739) on 2026-09-24
-- Total scans: 5, Keeping first at 2026-09-24T06:49:33.092Z
-- Deleting 4 duplicate(s):
DELETE FROM attendance_logs WHERE id = '58ee172c-4e26-471e-bfff-fe937019ba2b'; -- 2026-09-24T06:49:41.226Z
DELETE FROM attendance_logs WHERE id = '650f61c2-349e-4ec3-8a25-0c75143c1e59'; -- 2026-09-24T23:11:55.916Z
DELETE FROM attendance_logs WHERE id = '6c6de346-f5b5-4804-8b66-5343742c5675'; -- 2026-09-24T23:12:04.049Z
DELETE FROM attendance_logs WHERE id = '5e7f1339-1818-43b1-b1be-60e81ff55502'; -- 2026-09-24T23:12:11.828Z

-- MCHOIRULMUKMININ (1337409) on 2026-09-23
-- Total scans: 2, Keeping first at 2026-09-23T12:21:04.484Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'ca9b6352-c228-4bfe-a858-4911e8dcafcd'; -- 2026-09-23T12:21:13.704Z

-- RIKI HIDAYAT (1059494) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T23:28:25.610Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = '18e158b5-bd39-43f1-93ac-7247fc66da81'; -- 2026-09-23T23:28:39.665Z
DELETE FROM attendance_logs WHERE id = 'daf1c572-b47a-4c4b-a348-6d31173728d3'; -- 2026-09-23T23:30:13.667Z

-- Ibrohim muhammad habib (549561) on 2026-09-24
-- Total scans: 3, Keeping first at 2026-09-24T23:09:34.275Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'ec265776-6437-4851-9d2e-bdd070c69aa9'; -- 2026-09-24T23:09:47.613Z
DELETE FROM attendance_logs WHERE id = '10abbca4-4e8c-47e6-9657-076ec9c205ef'; -- 2026-09-24T23:09:57.821Z

-- TEGUH HERMANTO (736422) on 2026-09-23
-- Total scans: 3, Keeping first at 2026-09-23T13:19:10.924Z
-- Deleting 2 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'f7923521-ca8c-4cc9-a317-16c4cb1df291'; -- 2026-09-23T13:19:25.019Z
DELETE FROM attendance_logs WHERE id = '6a74250a-d1d0-4ff6-a7d8-cbe013912e62'; -- 2026-09-23T23:19:49.359Z

-- TEGUH HERMANTO (736422) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T23:15:30.342Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'db2262ab-dc5b-40de-b440-b6a8e6c3ca22'; -- 2026-09-24T23:15:38.478Z

-- IMAM KHABIBI (1048181) on 2026-09-24
-- Total scans: 2, Keeping first at 2026-09-24T23:17:47.041Z
-- Deleting 1 duplicate(s):
DELETE FROM attendance_logs WHERE id = 'e4937482-f43f-42f8-9c1e-5991844bafb4'; -- 2026-09-24T23:35:21.623Z

-- SUMMARY: 71 duplicate records will be deleted
-- 37 users affected