import BaseEntity from '../../base/BaseEntity'
import Filter from "../../base/Filter";
import {FilterType} from "../../base/FilterType";

export default class DownloadToken extends BaseEntity {

  static URL_FETCH_DOWNLOAD_TOKEN = "/api/alien/fetch/download/token"

  constructor(args) {
    super(args)
    this.userUuid = null
    this.matterUuid = null
    this.expireTime = null
    this.ip = null
  }

  render(obj) {
    super.render(obj)
    this.renderEntity("expireTime", Date)
  }

  getFilters() {
    return [
      ...super.getFilters()
    ]
  }

  httpFetchDownloadToken(matterUuid, successCallback, errorCallback) {
    let that = this
    let form = {
      matterUuid
    }
    this.httpPost(DownloadToken.URL_FETCH_DOWNLOAD_TOKEN, form, function (response) {
      that.render(response.data.data)
      that.safeCallback(successCallback)(response)
    }, errorCallback)
  }

}
