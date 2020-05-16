# みなじんくん

みなじんを自動で打刻してくれるくん。

## つかいかた

```sh
  curl -X POST -H "X-TOKEN: xxxxxxxxxx" https://xxxxx.cloudfunctions.net/minagine/start # 勤務開始
  curl -X POST -H "X-TOKEN: xxxxxxxxxx" https://xxxxx.cloudfunctions.net/minagine/end # 勤務終了
```

## deploy

```sh
  gcloud functions deploy minagine --runtime nodejs12 --trigger-http --project {project-id} --allow-unauthenticated
```
