<template>
  <div class="backyard-matter-list">
    <div class="row">

      <div class="col-md-6 mb10">
        <button class="btn btn-primary btn-sm " v-if="selectedMatters.length !== pager.data.length"
                @click.stop.prevent="checkAll">
          <i class="fa fa-check-square"></i>
          全选
        </button>
        <button class="btn btn-primary btn-sm "
                v-if="pager.data.length && selectedMatters.length === pager.data.length"
                @click.stop.prevent="checkNone">
          <i class="fa fa-square-o"></i>
          取消全选
        </button>
        <button class="btn btn-primary btn-sm " v-if="selectedMatters.length" @click.stop.prevent="deleteBatch">
          <i class="fa fa-trash"></i>
          删除
        </button>
        <button class="btn btn-primary btn-sm " v-if="selectedMatters.length"
                @click.stop.prevent="moveBatch($createElement)">
          <i class="fa fa-arrows"></i>
          移动
        </button>

        <span class="btn btn-primary btn-sm btn-file ">
              <slot name="button">
                <i class="fa fa-cloud-upload"></i>
                <span>上传文件</span>
              </slot>
              <input ref="refFile" type="file" multiple="multiple" @change.prevent.stop="triggerUpload"/>
				    </span>

        <button class="btn btn-sm btn-primary " @click.stop.prevent="createDirectory">
          <i class="fa fa-plus"></i>
          创建文件夹
        </button>

      </div>

      <div class="col-md-6 mb10">
        <div class="input-group">
          <input type="text" class="form-control" v-model="searchText" @keyup.enter="searchFile" placeholder="搜索文件">
          <span class="input-group-btn">
            <button type="button" class="btn btn-primary" @click.prevent.stop="searchFile">
              <i class="fa fa-search"></i>
            </button>
          </span>
        </div>
      </div>

      <div class="col-md-12">


        <div v-for="m in uploadMatters">
          <UploadMatterPanel :matter="m"/>
        </div>

        <div v-if="director.createMode">
          <MatterPanel ref="newMatterPanel" @createDirectorySuccess="refresh()"
                       :matter="newMatter"
                       :director="director"/>
        </div>
        <div v-for="matter in pager.data">
          <MatterPanel @goToDirectory="goToDirectory"
                       @deleteSuccess="refresh()"
                       :matter="matter"
                       :director="director"
                       @checkMatter="checkMatter"
                       @previewImage="previewImage"
          />
        </div>

        <div>
          <NbPager :pager="pager" :callback="refresh" emptyHint="该目录下暂无任何内容"/>
        </div>
      </div>


    </div>

  </div>
</template>
<script>
  import MatterPanel from './widget/MatterPanel'
  import UploadMatterPanel from './widget/UploadMatterPanel'
  import MoveBatchPanel from './widget/MoveBatchPanel'
  import NbSlidePanel from '../../common/widget/NbSlidePanel.vue'
  import NbExpanding from '../../common/widget/NbExpanding.vue'
  import NbCheckbox from '../../common/widget/NbCheckbox.vue'
  import NbFilter from '../../common/widget/filter/NbFilter'
  import NbPager from '../../common/widget/NbPager'
  import Matter from '../../common/model/matter/Matter'
  import Pager from '../../common/model/base/Pager'
  import Director from './widget/Director'
  import {Message, MessageBox} from 'element-ui'
  import {UserRole} from "../../common/model/user/UserRole";
  import {SortDirection} from "../../common/model/base/SortDirection";
  import {humanFileSize} from "../../common/filter/str";

  export default {
    data() {
      return {
        //当前文件夹信息。
        matter: new Matter(),
        //准备新建的文件。
        newMatter: new Matter(),
        //准备上传的一系列文件
        uploadMatters: this.$store.state.uploadMatters,
        //当前选中的文件
        selectedMatters: [],
        //搜索的文字
        searchText: null,
        pager: new Pager(Matter, 50),
        user: this.$store.state.user,
        preference: this.$store.state.preference,
        breadcrumbs: this.$store.state.breadcrumbs,
        director: new Director()

      }
    },
    components: {
      MatterPanel,
      UploadMatterPanel,
      MoveBatchPanel,
      NbCheckbox,
      NbFilter,
      NbPager,
      NbSlidePanel,
      NbExpanding
    },
    methods: {
      reset() {
        this.pager.page = 0
        this.pager.resetFilter()
        this.pager.enableHistory()
      },
      search() {
        this.pager.page = 0
        this.refresh()
      },
      refresh() {


        let puuid = this.$route.query.puuid
        if (puuid) {
          this.pager.setFilterValue('puuid', puuid)
        } else {
          this.pager.setFilterValue('puuid', 'root')
        }

        //如果所有的排序都没有设置，那么默认以时间降序。
        this.pager.setFilterValue('orderCreateTime', SortDirection.DESC)
        this.pager.setFilterValue("orderDir", SortDirection.DESC)

        //如果没有设置用户的话，那么默认显示当前登录用户的资料
        if (!this.pager.getFilterValue('userUuid')) {
          this.pager.setFilterValue('userUuid', this.user.uuid)
        }

        //如果没有设置alien，那么默认听从偏好设置中的。
        if (this.pager.getFilterValue('alien') !== true || this.pager.getFilterValue('alien') !== false) {
          //显示应用文件意味着 应用文件和非应用文件一起显示。
          if (!this.preference.showAlien) {
            this.pager.setFilterValue('alien', false)
          }
        }

        this.pager.setFilterValue("name", null)


        //刷新面包屑
        this.refreshBreadcrumbs()

        this.pager.httpFastPage()
      },
      goToDirectory(uuid) {
        this.pager.setFilterValue('puuid', uuid)
        this.pager.page = 0
        let query = this.pager.getParams()


        //采用router去管理路由，否则浏览器的回退按钮出现意想不到的问题。
        this.$router.push({
          path: '/',
          query: query
        })

      },
      refreshBreadcrumbs() {

        let that = this

        //清空暂存区
        this.selectedMatters.splice(0, this.selectedMatters.length)

        let uuid = that.pager.getFilterValue('puuid')

        //根目录简单处理即可。
        if (!uuid || uuid === 'root') {

          this.matter.uuid = 'root'
          that.breadcrumbs.splice(0, that.breadcrumbs.length)
          that.breadcrumbs.push({
            title: '全部文件'
          })

        } else {

          this.matter.uuid = uuid
          this.matter.httpDetail(function () {

            let arr = []
            let cur = that.matter.parent
            while (cur) {
              arr.push(cur)
              cur = cur.parent
            }

            that.breadcrumbs.splice(0, that.breadcrumbs.length)
            let query = that.pager.getParams()
            query['puuid'] = 'root'
            //添加一个随机数，防止watch $route失败
            query['_t'] = new Date().getTime()
            that.breadcrumbs.push({
              title: '全部文件',
              path: '/',
              query: query
            })

            for (let i = arr.length - 1; i >= 0; i--) {
              let m = arr[i]
              let query = that.pager.getParams()
              query['puuid'] = m.uuid
              query['_t'] = new Date().getTime()
              that.breadcrumbs.push({
                title: m.name,
                path: '/',
                query: query
              })
            }
            //第一个文件
            that.breadcrumbs.push({
              title: that.matter.name
            })
          })
        }
      },
      createDirectory() {
        let that = this
        that.newMatter.name = '新建文件夹'
        that.newMatter.dir = true
        that.newMatter.editMode = true
        that.newMatter.puuid = that.matter.uuid
        if (!that.newMatter.puuid) {
          that.newMatter.puuid = 'root'
        }


        //指定为当前选择的用户。
        //如果没有设置用户的话，那么默认显示当前登录用户的资料
        if (!that.pager.getFilterValue('userUuid')) {
          that.newMatter.userUuid = that.user.uuid
        } else {
          that.newMatter.userUuid = that.pager.getFilterValue('userUuid')
        }

        that.director.createMode = true

        setTimeout(function () {
          that.$refs.newMatterPanel.highLight()
        }, 100)
      },
      triggerUpload() {
        let that = this

        let domFiles = that.$refs['refFile'].files;
        if (!domFiles || !domFiles.length) {
          that.$message.error("没有选择文件")
          return;
        }

        if (domFiles.length > 1000) {
          that.$message.error("最多只能同时选取1000个文件")
          return;
        }

        for (let i = 0; i < domFiles.length; i++) {
          let domFile = domFiles[i];
          let m = new Matter()
          m.dir = false
          m.puuid = that.matter.uuid

          //指定为当前选择的用户。
          //如果没有设置用户的话，那么默认显示当前登录用户的资料
          if (!that.pager.getFilterValue('userUuid')) {
            m.userUuid = that.user.uuid
          } else {
            m.userUuid = that.pager.getFilterValue('userUuid')
          }

          //判断文件大小。
          if (that.user.sizeLimit >= 0) {
            if (domFile.size > that.user.sizeLimit) {
              that.$message.error("文件大小超过了限制 " + humanFileSize(domFile.size) + " > " + humanFileSize(that.user.sizeLimit))
              continue
            }
          }

          m.file = domFile

          m.httpUpload(function () {
            that.$store.state.uploadListInstance.refresh()
          })

          that.uploadMatters.push(m)
        }


      },

      previewImage(matter) {
        let that = this;

        //从matter开始预览图片
        let imageArray = []
        let startIndex = -1;
        this.pager.data.forEach(function (item, index) {
          if (item.isImage()) {
            imageArray.push(item.getPreviewUrl())
            if (item.uuid === matter.uuid) {
              startIndex = imageArray.length - 1
            }
          }
        })

        that.$photoSwipePlugin.showPhotos(imageArray, startIndex)

      },
      //全选
      checkAll() {
        this.pager.data.forEach(function (i, index) {
          i.check = true
        })
        this.checkMatter()
      },
      //取消全选
      checkNone() {
        this.pager.data.forEach(function (i, index) {
          i.check = false
        })
        this.checkMatter()
      },
      //选择文件时放入暂存区等待操作
      checkMatter(matter) {
        let that = this
        //统计所有的勾选
        this.selectedMatters.splice(0, this.selectedMatters.length)
        this.pager.data.forEach(function (matter, index) {
          if (matter.check) {
            that.selectedMatters.push(matter)
          }
        })

      },
      //批量删除
      deleteBatch() {
        let that = this
        MessageBox.confirm('此操作将永久删除这些文件, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          callback: function (action, instance) {
            if (action === 'confirm') {
              let uuids = ""
              that.selectedMatters.forEach(function (item, index) {
                if (index === 0) {
                  uuids = item.uuid
                } else {
                  uuids = uuids + "," + item.uuid
                }
              })
              that.matter.httpDeleteBatch(uuids, function (response) {
                Message.success('删除成功！')
                that.refresh()
              })
            }

          }
        })
      },
      //批量移动
      moveBatch(createElement) {
        let that = this

        let targetMatterUuid = null
        let dom = createElement(MoveBatchPanel, {
          props: {
            version: (new Date()).getTime(),
            userUuid: that.selectedMatters[0].userUuid,
            callback: function (matter) {
              if (matter.uuid) {
                targetMatterUuid = matter.uuid
              } else {
                targetMatterUuid = "root"
              }
            }
          }
        })

        MessageBox({
          title: '移动到',
          message: dom,
          customClass: 'wp50',
          confirmButtonText: '确定',
          showCancelButton: true,
          cancelButtonText: '关闭',
          callback: (action, instance) => {
            if (action === 'confirm') {
              let uuids = ""
              that.selectedMatters.forEach(function (item, index) {
                if (index === 0) {
                  uuids = item.uuid
                } else {
                  uuids = uuids + "," + item.uuid
                }
              })

              that.matter.httpMove(uuids, targetMatterUuid, function (response) {
                Message.success('移动成功！')
                that.refresh()
              })
            }
          }
        })
      },
      searchFile() {

        let that = this;
        if (that.searchText) {

          //刷新面包屑
          that.refreshBreadcrumbs()


          that.pager.resetFilter()
          that.pager.setFilterValue('puuid', null)
          that.pager.setFilterValue("orderCreateTime", SortDirection.DESC)
          that.pager.setFilterValue("name", that.searchText)

          that.pager.httpFastPage()


        } else {


          that.refresh()

        }


      }
    },
    watch: {
      '$route'(newVal, oldVal) {

        this.refresh()

      },
      'searchText'(newVal, oldVal) {
        if (oldVal && !newVal) {
          this.refresh()
        }
      }

    },
    created() {
      /*初始化inputSelection*/
      if (this.user.role === UserRole.ADMINISTRATOR) {
        this.pager.getFilter('userUuid').visible = true
      } else {
        this.pager.setFilterValue('userUuid', this.user.uuid)
      }
    },
    mounted() {
      let that = this
      this.pager.enableHistory()
      //更新vuex中List实例，主要解决大文件上传持有的功能。
      this.$store.state.uploadListInstance = this

      this.refresh()
    }
  }
</script>
<style lang="less" rel="stylesheet/less">
  @import "../../assets/css/global/variables";

  .backyard-matter-list {

  }
</style>
